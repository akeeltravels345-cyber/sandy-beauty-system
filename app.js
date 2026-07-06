/* ============================================================
   app.js  -  views, routing, interactions
   ============================================================ */

const App = (function () {
  "use strict";

  const ui = {
    view: "site",       // site | login | dash
    siteCat: "all",
    ownerTab: "overview",
    staffTab: "day",
    dockOpen: false,
    booking: null,      // {serviceId, staffId, startMs, fromWaitlistId}
    manage: null,       // {email, looked}
    claim: null,        // {waitId}
    login: { staffId: null, pin: "" },
  };

  const $ = (id) => document.getElementById(id);
  const H = Charts.esc;
  const M = SB.money;

  /* ---------------- toast ---------------- */
  function toast(msg, kind) {
    const wrap = $("toasts");
    const el = document.createElement("div");
    el.className = "toast " + (kind || "");
    el.innerHTML = msg;
    wrap.appendChild(el);
    setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .4s"; }, 2600);
    setTimeout(() => el.remove(), 3100);
  }

  /* ---------------- top bar ---------------- */
  function topbar() {
    const user = SB.currentUser();
    let right = "";
    if (ui.view === "dash" && user) {
      right =
        '<div class="user-chip">' +
          '<div class="avatar" style="background:' + user.color + '">' + initials(user.name) + "</div>" +
          '<div><div class="u-name">' + H(user.name) + '</div><div class="u-role">' + H(user.title) + "</div></div>" +
        "</div>" +
        '<button class="btn-logout" onclick="App.doLogout()">Sign out</button>';
    } else if (ui.view === "site") {
      right = '<button class="btn-logout" onclick="App.openManage()">Manage booking</button>' +
        '<button class="btn btn-ghost btn-sm" onclick="App.go(\'login\')">Team login</button>';
    } else {
      right = '<button class="btn-logout" onclick="App.go(\'site\')">Back to site</button>';
    }
    return (
      '<div class="topbar">' +
        '<div class="brand" style="cursor:pointer" onclick="App.go(\'site\')">' +
          '<div class="brand-mark">S</div>' +
          '<div><div class="brand-name">Sandy Beauty</div><div class="brand-sub">& Academy</div></div>' +
        "</div>" +
        '<div class="topbar-spacer"></div>' +
        right +
      "</div>"
    );
  }

  function initials(name) { return name.split(" ").map((w) => w[0]).slice(0, 2).join(""); }

  /* ================================================================
     CLIENT BOOKING SITE
     ================================================================ */
  function siteView() {
    const cats = ["all"].concat(Object.keys(SB.CATEGORIES));
    const catTabs = cats.map((c) => {
      const label = c === "all" ? "All treatments" : SB.CATEGORIES[c].label;
      return '<button class="' + (ui.siteCat === c ? "active" : "") + '" onclick="App.setCat(\'' + c + '\')">' + H(label) + "</button>";
    }).join("");

    const services = SB.SERVICES.filter((s) => ui.siteCat === "all" || s.category === ui.siteCat);
    const cards = services.map((s) => {
      const cat = SB.CATEGORIES[s.category];
      const slots = availableSlots(s.id, { limit: 1 });
      const soon = slots.length ? slots[0] : null;
      const availTxt = soon
        ? '<span class="dot-avail" style="background:var(--green)"></span>Next: ' + SB.fmtDay(new Date(soon.start)).replace(/,.*/, "") + " · " + H(SB.locationById(soon.locationId).name)
        : '<span class="dot-avail" style="background:var(--amber)"></span>Fully booked';
      return (
        '<div class="svc-card">' +
          '<div class="svc-cat" style="color:' + cat.color + '">' + H(cat.label) + "</div>" +
          '<div class="svc-name">' + H(s.name) + "</div>" +
          '<div class="svc-meta"><span>' + s.mins + " min</span></div>" +
          '<div class="svc-avail">' + availTxt + "</div>" +
          '<div class="svc-foot">' +
            '<div class="svc-price">' + M(s.price) + "</div>" +
            (soon
              ? '<button class="btn btn-primary btn-sm" onclick="App.openBooking(\'' + s.id + '\')">Book</button>'
              : '<button class="btn btn-ghost btn-sm" onclick="App.openWaitlist(\'' + s.id + '\')">Join waitlist</button>') +
          "</div>" +
        "</div>"
      );
    }).join("");

    const b = SB.BRAND;
    return (
      '<div class="site">' +
        '<div class="hero">' +
          '<div class="eyebrow">Kingston upon Thames · Shoreditch</div>' +
          '<h1 class="serif">Aesthetics, artistry &amp; advanced skin</h1>' +
          "<p>" + H(b.tagline) + ". Book online in seconds, or join the waitlist and we will alert you the moment a slot opens.</p>" +
          '<div class="hero-meta">' +
            "<div><b>10+ yrs</b>experience</div>" +
            "<div><b>4.9★</b>client rating</div>" +
            "<div><b>26</b>treatments</div>" +
            "<div><b>CPD</b>accredited</div>" +
          "</div>" +
        "</div>" +
        '<div class="site-wrap">' +
          '<div class="offer-banner"><span class="offer-tag">Special offer</span> 10% off when you book any two services together. Applied automatically at the clinic.</div>' +
          '<div class="cat-tabs">' + catTabs + "</div>" +
          '<div class="svc-grid">' + cards + "</div>" +
          '<div class="footer-note">' +
            SB.LOCATIONS.map((L) => "<b>" + H(L.name) + "</b> · " + H(L.address)).join("<br>") +
            "<br>" + H(b.phone) + "  ·  " + H(b.email) + "</div>" +
        "</div>" +
      "</div>"
    );
  }

  // find open slots for a service across the next working days.
  // opts: { locationId, staffId ('any' or id), day (ms, restrict to one day), limit }
  // each slot returns { start, staffId, locationId }. A practitioner's location on a
  // given day comes from their rota, which is what makes availability differ by branch.
  function availableSlots(serviceId, opts) {
    opts = opts || {};
    const limit = opts.limit || 1;
    const svc = SB.serviceById(serviceId);
    let capable = SB.STAFF.filter((st) => st.skills.includes(svc.category));
    if (opts.staffId && opts.staffId !== "any") capable = capable.filter((st) => st.id === opts.staffId);
    const out = [];
    const now = SB.now();
    for (let d = 1; d <= 25 && out.length < limit; d++) {
      const day = SB.startOfDay(SB.addDays(now, d));
      if (day.getDay() === 0) continue;
      if (opts.day && !SB.sameDay(day, new Date(opts.day))) continue;
      for (const st of capable) {
        const loc = st.rota[day.getDay()];
        if (!loc) continue;
        if (opts.locationId && opts.locationId !== "any" && loc !== opts.locationId) continue;
        for (const hr of [10, 11, 13, 14, 15, 16, 17]) {
          const t = new Date(day); t.setHours(hr, 0, 0, 0);
          const clash = SB.state.appts.some((a) =>
            (a.status === "booked" || a.status === "completed") && a.staffId === st.id &&
            Math.abs(a.start - t.getTime()) < 60 * 60 * 1000);
          // deterministic scarcity so the calendar is stable between renders
          const seedFree = ((day.getDate() * 7 + hr * 3 + st.id.charCodeAt(0)) % 10) < 4;
          if (!clash && seedFree) out.push({ start: t.getTime(), staffId: st.id, locationId: loc });
          if (out.length >= limit) break;
        }
        if (out.length >= limit) break;
      }
    }
    out.sort((a, b) => a.start - b.start);
    return out;
  }

  /* ---------- booking modal (proper calendar: location + aesthetician + date) ---------- */
  function openBooking(serviceId, fromWaitlistId) {
    const earliest = availableSlots(serviceId, { limit: 1 })[0];
    ui.booking = {
      serviceId,
      loc: earliest ? earliest.locationId : SB.LOCATIONS[0].id,
      staff: "any",
      day: earliest ? SB.startOfDay(new Date(earliest.start)).getTime() : null,
      pick: null,
      fromWaitlistId: fromWaitlistId || null,
    };
    renderModal();
  }
  function openWaitlist(serviceId) {
    ui.booking = { serviceId, waitlist: true, wloc: "any" };
    renderModal();
  }
  function selectSlot(startMs, staffId, locationId) {
    ui.booking.pick = { startMs: startMs, staffId: staffId, locationId: locationId };
    renderModal();
  }
  function setBookingLoc(loc) {
    ui.booking.loc = loc; ui.booking.pick = null;
    const e = availableSlots(ui.booking.serviceId, { locationId: loc, staffId: ui.booking.staff, limit: 1 })[0];
    if (e) ui.booking.day = SB.startOfDay(new Date(e.start)).getTime();
    renderModal();
  }
  function setBookingStaff(id) {
    ui.booking.staff = id; ui.booking.pick = null;
    const e = availableSlots(ui.booking.serviceId, { locationId: ui.booking.loc, staffId: id, limit: 1 })[0];
    if (e) { ui.booking.loc = e.locationId; ui.booking.day = SB.startOfDay(new Date(e.start)).getTime(); }
    renderModal();
  }
  function setBookingDay(dayMs) { ui.booking.day = dayMs; ui.booking.pick = null; renderModal(); }
  function setWaitLoc(loc) { ui.booking.wloc = loc; renderModal(); }

  function renderModal() {
    const m = $("modal");
    if (ui.claim) { m.innerHTML = claimModal(); return; }
    if (ui.manage) { m.innerHTML = manageModal(); return; }
    if (!ui.booking) { m.innerHTML = ""; return; }
    const svc = SB.serviceById(ui.booking.serviceId);

    if (ui.booking.waitlist) {
      const wlocPills = [{ id: "any", name: "Any location" }].concat(SB.LOCATIONS).map((L) =>
        '<button class="pick-pill ' + (ui.booking.wloc === L.id ? "sel" : "") + '" onclick="App.setWaitLoc(\'' + L.id + '\')">' +
        (L.color ? '<span class="pp-dot" style="background:' + L.color + '"></span>' : "") + '<span class="pp-name">' + H(L.name) + "</span></button>").join("");
      m.innerHTML = modalShell(
        "Join the waitlist",
        "We will alert you the instant a " + H(svc.name) + " slot opens.",
        '<div class="callout"><span>⭐</span><div>You will be one of the first contacted when a cancellation frees a slot. You then have 24 hours to claim it before it passes to the next client.</div></div>' +
        '<div class="bk-label">Preferred location</div><div class="pick-row">' + wlocPills + "</div>" +
        '<div class="divider"></div>' +
        nameFields() +
        '<div class="field"><label>Anything we should know?</label><textarea id="f-note" rows="2" placeholder="Preferred days / times, flexibility..."></textarea></div>',
        '<button class="btn btn-ghost btn-block" onclick="App.closeModal()">Cancel</button>' +
        '<button class="btn btn-primary btn-block" onclick="App.submitWaitlist()">Join waitlist</button>'
      );
      return;
    }

    const b = ui.booking, loc = b.loc;
    const capable = SB.STAFF.filter((st) => st.skills.includes(svc.category));

    // location selector - each shows that branch's earliest date for this service
    const locPills = SB.LOCATIONS.map((L) => {
      const e = availableSlots(svc.id, { locationId: L.id, staffId: b.staff, limit: 1 })[0];
      return '<button class="pick-pill ' + (loc === L.id ? "sel" : "") + '" onclick="App.setBookingLoc(\'' + L.id + '\')">' +
        '<span class="pp-dot" style="background:' + L.color + '"></span>' +
        '<span class="pp-name">' + H(L.name) + "</span>" +
        '<span class="pp-sub">' + (e ? "from " + SB.fmtDay(new Date(e.start)).replace(/,.*/, "") : "fully booked") + "</span></button>";
    }).join("");

    // aesthetician selector (Any + those who can do this service)
    const staffPills = ['<button class="pick-pill ' + (b.staff === "any" ? "sel" : "") + '" onclick="App.setBookingStaff(\'any\')"><span class="pp-name">Any available</span></button>']
      .concat(capable.map((st) =>
        '<button class="pick-pill ' + (b.staff === st.id ? "sel" : "") + '" onclick="App.setBookingStaff(\'' + st.id + '\')">' +
        '<span class="avatar" style="width:22px;height:22px;font-size:10px;background:' + st.color + '">' + initials(st.name) + "</span>" +
        '<span class="pp-name">' + H(st.name.split(" ")[0]) + "</span></button>")).join("");

    // cross-location earlier hint
    let hint = "";
    const eHere = availableSlots(svc.id, { locationId: loc, staffId: b.staff, limit: 1 })[0];
    const eAny = availableSlots(svc.id, { staffId: b.staff, limit: 1 })[0];
    if (eAny && (!eHere || eAny.start < eHere.start) && eAny.locationId !== loc) {
      const L = SB.locationById(eAny.locationId);
      hint = '<div class="callout hint-click" onclick="App.setBookingLoc(\'' + eAny.locationId + '\')"><span>📍</span><div><b>' + H(L.name) +
        "</b> has an earlier opening on <b>" + SB.fmtDay(new Date(eAny.start)) + " at " + SB.fmtTime(new Date(eAny.start)) + "</b>. Tap to switch branch.</div></div>";
    }

    // date strip for the chosen location + aesthetician
    const days = [];
    for (let d = 1; d <= 20 && days.length < 12; d++) {
      const day = SB.startOfDay(SB.addDays(SB.now(), d));
      if (day.getDay() === 0) continue;
      const has = availableSlots(svc.id, { locationId: loc, staffId: b.staff, day: day.getTime(), limit: 1 }).length > 0;
      days.push({ ms: day.getTime(), date: day, has });
    }
    if (!b.day || !days.some((x) => x.ms === b.day)) { const f = days.find((x) => x.has); b.day = f ? f.ms : (days[0] && days[0].ms); }
    const dateStrip = days.map((x) => {
      const sel = x.ms === b.day;
      return '<button class="cal-day ' + (sel ? "sel" : "") + (x.has ? "" : " empty") + '" ' + (x.has ? "" : "disabled ") + 'onclick="App.setBookingDay(' + x.ms + ')">' +
        '<span class="cal-dow">' + x.date.toLocaleDateString("en-GB", { weekday: "short" }) + "</span>" +
        '<span class="cal-date">' + x.date.getDate() + "</span>" +
        '<span class="cal-mon">' + x.date.toLocaleDateString("en-GB", { month: "short" }) + "</span>" +
        (x.has ? '<span class="cal-dot"></span>' : "") + "</button>";
    }).join("");

    // times for the selected day
    const daySlots = b.day ? availableSlots(svc.id, { locationId: loc, staffId: b.staff, day: b.day, limit: 40 }) : [];
    const slotHtml = daySlots.length
      ? '<div class="slot-grid">' + daySlots.map((s) => {
          const sel = b.pick && b.pick.startMs === s.start && b.pick.staffId === s.staffId;
          const st = SB.staffById(s.staffId);
          return '<button class="slot ' + (sel ? "sel" : "") + '" onclick="App.selectSlot(' + s.start + ",'" + s.staffId + "','" + s.locationId + "')\">" +
            SB.fmtTime(new Date(s.start)) + '<span class="sd">' + st.name.split(" ")[0] + "</span></button>";
        }).join("") + "</div>"
      : '<div class="slot-none">No openings this day. Try another date, aesthetician or branch, or join the waitlist.</div>';

    m.innerHTML = modalShell(
      "Book " + H(svc.name),
      M(svc.price) + " · " + svc.mins + " minutes · " + H(SB.CATEGORIES[svc.category].label),
      '<div class="bk-label">Location</div><div class="pick-row">' + locPills + "</div>" +
      '<div class="bk-label">Aesthetician</div><div class="pick-row">' + staffPills + "</div>" +
      (hint ? '<div style="margin-bottom:4px">' + hint + "</div>" : "") +
      '<div class="bk-label">Choose a date</div><div class="cal-strip">' + dateStrip + "</div>" +
      '<div class="bk-label">' + (b.day ? SB.fmtDate(new Date(b.day)) + " · " + H(SB.locationById(loc).name) : "Times") + "</div>" + slotHtml +
      (b.pick ? '<div class="divider"></div>' + nameFields() : ""),
      '<button class="btn btn-ghost btn-block" onclick="App.closeModal()">Cancel</button>' +
      '<button class="btn btn-primary btn-block" onclick="App.submitBooking()" ' + (b.pick ? "" : "disabled") + ">Confirm booking</button>"
    );
  }

  function nameFields() {
    return (
      '<div class="field-row">' +
        '<div class="field"><label>Full name</label><input id="f-name" placeholder="Your name"></div>' +
        '<div class="field"><label>Mobile</label><input id="f-phone" placeholder="07..."></div>' +
      "</div>" +
      '<div class="field"><label>Email</label><input id="f-email" type="email" placeholder="you@email.com"></div>'
    );
  }

  function modalShell(title, sub, body, foot) {
    return (
      '<div class="modal-back" onclick="App.backdropClose(event)">' +
        '<div class="modal">' +
          '<div class="modal-head"><h2>' + title + "</h2><p>" + sub + "</p>" +
            '<button class="modal-close" onclick="App.closeModal()">×</button></div>' +
          '<div class="modal-body">' + body + "</div>" +
          '<div class="modal-foot">' + foot + "</div>" +
        "</div>" +
      "</div>"
    );
  }

  function readNameFields() {
    const name = ($("f-name") || {}).value || "";
    const email = ($("f-email") || {}).value || "";
    const phone = ($("f-phone") || {}).value || "";
    if (!name.trim()) { toast("Please enter your name", "info"); return null; }
    if (!email.trim()) { toast("Please enter your email", "info"); return null; }
    return { clientName: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim() };
  }

  function submitBooking() {
    const nf = readNameFields(); if (!nf) return;
    const b = ui.booking;
    if (!b.pick) { toast("Please choose a time", "info"); return; }
    SB.book({ ...nf, serviceId: b.serviceId, staffId: b.pick.staffId, locationId: b.pick.locationId, startMs: b.pick.startMs, fromWaitlistId: b.fromWaitlistId });
    const loc = SB.locationById(b.pick.locationId);
    closeModal();
    toast("✅ Booked at " + H(loc.name) + "! Confirmation sent to " + H(nf.email), "good");
    render();
  }
  function submitWaitlist() {
    const nf = readNameFields(); if (!nf) return;
    const note = ($("f-note") || {}).value || "";
    SB.joinWaitlist({ ...nf, serviceId: ui.booking.serviceId, locationId: ui.booking.wloc || "any", note });
    closeModal();
    toast("⭐ You are on the waitlist. Watch your phone!", "good");
    render();
  }
  function closeModal() { ui.booking = null; ui.manage = null; ui.claim = null; $("modal").innerHTML = ""; }
  function backdropClose(e) { if (e.target.classList.contains("modal-back")) closeModal(); }

  /* ---------- manage booking (client self-service, lookup by email) ---------- */
  function openManage() { ui.manage = { email: "", looked: false }; renderModal(); setTimeout(() => { const el = $("mng-email"); if (el) el.focus(); }, 30); }
  function manageLookup() {
    const v = ($("mng-email") || {}).value || "";
    ui.manage = { email: v.trim().toLowerCase(), looked: true };
    renderModal();
  }
  function clientCancel(apptId) {
    const res = SB.cancelAppointment(apptId, "client");
    if (res && res.offered && res.offered.length) toast("Booking cancelled. " + res.offered.length + " waitlist clients have been alerted.", "info");
    else toast("Your booking has been cancelled.", "info");
    renderModal(); render();
  }

  function manageModal() {
    const email = ui.manage.email;
    let body;
    if (!ui.manage.looked) {
      body = '<div class="callout info"><span>🔎</span><div>Enter the email you booked with to see and manage your appointments.</div></div>' +
        '<div class="field" style="margin-top:14px"><label>Email</label><input id="mng-email" type="email" placeholder="you@email.com" value="' + H(email) + '"></div>';
      return modalShell("Manage my booking", "Look up your appointments", body,
        '<button class="btn btn-ghost btn-block" onclick="App.closeModal()">Close</button>' +
        '<button class="btn btn-primary btn-block" onclick="App.manageLookup()">Find my bookings</button>');
    }
    const client = SB.state.clients.find((c) => c.email === email);
    const appts = client ? SB.state.appts.filter((a) => a.clientId === client.id && a.status === "booked" && a.start >= nowMs()).sort((a, b) => a.start - b.start) : [];
    if (!appts.length) {
      body = '<div class="slot-none">No upcoming bookings found for <b>' + (H(email) || "that email") + "</b>.<br>Try the email you booked with, or make a new booking.</div>";
    } else {
      body = '<p class="muted" style="margin-bottom:12px">Hi ' + H(client.name.split(" ")[0]) + ", here are your upcoming appointments.</p><div class=\"queue\">" +
        appts.map((a) => {
          const s = SB.serviceById(a.serviceId), st = SB.staffById(a.staffId), L = SB.locationById(a.locationId);
          return '<div class="q-item"><div class="q-pos" style="background:' + SB.CATEGORIES[s.category].color + ';color:#fff">' + SB.fmtTime(new Date(a.start)).replace(":00", "") + "</div>" +
            '<div class="q-main"><div class="q-name">' + H(s.name) + (L ? ' <span class="loc-badge" style="background:' + L.color + '22;color:' + L.color + '">📍 ' + H(L.name) + "</span>" : "") + "</div>" +
            '<div class="q-svc">' + SB.fmtDay(new Date(a.start)) + " " + SB.fmtTime(new Date(a.start)) + " · " + H(st.name.split(" ")[0]) + " · " + M(a.price) + "</div></div>" +
            '<button class="btn btn-ghost btn-sm" onclick="App.clientCancel(\'' + a.id + '\')">Cancel</button></div>';
        }).join("") + "</div>";
    }
    return modalShell("Manage my booking", H(email), body,
      '<button class="btn btn-ghost btn-block" onclick="App.openManage()">Search again</button>' +
      '<button class="btn btn-primary btn-block" onclick="App.closeModal()">Done</button>');
  }

  /* ---------- client claim experience (phone-style offer screen) ---------- */
  function openClaim(waitId) { ui.claim = { waitId }; renderModal(); }
  function claimAccept() {
    const id = ui.claim.waitId;
    const a = SB.acceptOffer(id);
    ui.claim = null;
    if (a) toast("✅ Slot claimed. " + M(a.price) + " recovered from a cancellation.", "good");
    render();
  }
  function claimDecline() {
    const id = ui.claim.waitId;
    SB.declineOffer(id);
    ui.claim = null;
    toast("Offer declined. It moves to the next client in line.", "info");
    render();
  }
  function claimModal() {
    const w = SB.state.waitlist.find((x) => x.id === ui.claim.waitId);
    if (!w || w.status !== "offered") { ui.claim = null; return ""; }
    const c = SB.clientById(w.clientId), s = SB.serviceById(w.slot.serviceId), st = SB.staffById(w.slot.staffId);
    const L = SB.locationById(w.slot.locationId);
    const left = Math.max(0, w.offerExpires - nowMs());
    const hrs = Math.floor(left / SB.HOUR), mins = Math.floor((left % SB.HOUR) / 60000);
    const phone =
      '<div class="phone"><div class="phone-notch"></div><div class="phone-screen">' +
        '<div class="sms-app"><div class="sms-from">Sandy Beauty</div>' +
          '<div class="sms-bubble">Hi ' + H(c ? c.name.split(" ")[0] : "there") + "! A spot just opened for <b>" + H(s.name) + "</b> with " + H(st.name.split(" ")[0]) +
            " at <b>" + H(L ? L.name : "our clinic") + "</b> on <b>" + SB.fmtDay(new Date(w.slot.start)) + " at " + SB.fmtTime(new Date(w.slot.start)) + "</b>. " +
            "You are next on the waitlist. Tap to claim - offer expires in " + hrs + "h " + mins + "m. 💕</div>" +
          '<div class="sms-time">' + SB.fmtTime(SB.now()) + "</div>" +
        "</div>" +
        '<div class="claim-card">' +
          '<div class="claim-svc">' + H(s.name) + "</div>" +
          '<div class="claim-meta">' + SB.fmtDay(new Date(w.slot.start)) + " · " + SB.fmtTime(new Date(w.slot.start)) + " · " + H(st.name.split(" ")[0]) + (L ? " · " + H(L.name) : "") + "</div>" +
          '<div class="claim-price">' + M(w.slot.price) + "</div>" +
          '<div class="claim-timer">⏳ ' + hrs + "h " + mins + "m to claim</div>" +
          '<button class="btn btn-primary btn-block" onclick="App.claimAccept()" style="margin-top:12px">Claim this slot</button>' +
          '<button class="btn btn-ghost btn-block" onclick="App.claimDecline()" style="margin-top:8px">Not this time</button>' +
        "</div>" +
      "</div></div>";
    return modalShell("Client's phone", "This is exactly what " + H(c ? c.name.split(" ")[0] : "the client") + " receives",
      phone, '<button class="btn btn-ghost btn-block" onclick="App.closeModal()">Close preview</button>');
  }

  /* ================================================================
     LOGIN
     ================================================================ */
  function loginView() {
    const opts = SB.STAFF.map((s) => {
      const sel = ui.login.staffId === s.id;
      return '<button class="staff-opt ' + (sel ? "sel" : "") + '" onclick="App.pickStaff(\'' + s.id + '\')">' +
        '<div class="avatar" style="background:' + s.color + '">' + initials(s.name) + "</div>" +
        '<div><div class="u-name">' + H(s.name) + "</div><div class=\"u-role\">" +
        (s.role === "owner" ? "Owner" : "Aesthetician") + " · " + H(s.title) + "</div></div>" +
        (s.role === "owner" ? '<span class="pill pill-rose" style="margin-left:auto">Owner</span>' : "") +
        "</button>";
    }).join("");

    const pinBoxes = [0,1,2,3].map((i) =>
      '<input type="password" inputmode="numeric" maxlength="1" id="pin' + i + '" value="' +
      (ui.login.pin[i] || "") + '" oninput="App.pinInput(' + i + ',this.value)">').join("");

    return (
      '<div class="login-wrap">' +
        '<div class="login-card">' +
          '<div class="brand-mark">S</div>' +
          '<h2 class="serif center" style="font-size:28px">Team sign in</h2>' +
          '<p class="center muted" style="font-size:13px">Select your profile and enter your PIN</p>' +
          '<div class="staff-pick">' + opts + "</div>" +
          (ui.login.staffId
            ? '<div class="pin-row">' + pinBoxes + "</div>" +
              '<button class="btn btn-primary btn-block" style="margin-top:10px" onclick="App.tryLogin()">Sign in</button>'
            : "") +
          '<div class="login-hint">Demo PINs · Owner 1234 · Amira 1111 · Priya 2222 · Lena 3333</div>' +
        "</div>" +
      "</div>"
    );
  }
  function pickStaff(id) { ui.login.staffId = id; ui.login.pin = ""; render(); setTimeout(() => { const el = $("pin0"); if (el) el.focus(); }, 30); }
  function pinInput(i, v) {
    const arr = ui.login.pin.split("");
    arr[i] = v.replace(/\D/g, "").slice(-1) || "";
    ui.login.pin = arr.join("");
    if (v && i < 3) { const n = $("pin" + (i + 1)); if (n) n.focus(); }
    if (ui.login.pin.replace(/\s/g,"").length === 4) setTimeout(tryLogin, 120);
  }
  // private ntfy.sh topic Akeel subscribes to for demo sign-in alerts
  const LOGIN_ALERT_TOPIC = "sb-demo-login-akl-7q2m9x4p3z";
  function notifyLogin(staff) {
    try {
      const role = staff.role === "owner" ? "Owner" : "Aesthetician";
      const when = new Date().toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
      fetch("https://ntfy.sh/" + LOGIN_ALERT_TOPIC, {
        method: "POST",
        body: staff.name + " (" + role + ") signed into the Sandy Beauty demo · " + when,
        headers: { "Title": "Sandy Beauty demo login", "Tags": "sparkles" },
        keepalive: true,
      }).catch(function () {});
    } catch (e) { /* never let an alert break login */ }
  }

  function tryLogin() {
    const s = SB.login(ui.login.staffId, ui.login.pin);
    if (s) {
      notifyLogin(s);
      ui.view = "dash";
      ui.ownerTab = "overview"; ui.staffTab = "day";
      toast("Welcome back, " + H(s.name.split(" ")[0]), "info");
      render();
    } else {
      toast("Incorrect PIN, try again", "info");
      ui.login.pin = ""; render();
    }
  }
  function doLogout() { SB.logout(); ui.view = "site"; render(); }

  /* ================================================================
     DASHBOARD SHELL
     ================================================================ */
  function dashView() {
    const user = SB.currentUser();
    if (!user) { ui.view = "login"; return loginView(); }
    const isOwner = user.role === "owner";
    const items = isOwner
      ? [["overview","Overview","grid"],["revenue","Revenue","wallet"],["services","Treatments","droplet"],
         ["team","My Team","users"],["clients","Clients","heart"],["waitlist","Waitlist","star"]]
      : [["day","My Day","sun"],["schedule","Schedule","calendar"],["earnings","Earnings","wallet"],["waitlist","Waitlist","star"]];
    const tab = isOwner ? ui.ownerTab : ui.staffTab;
    const side =
      '<div class="side">' +
        '<div class="side-group">' + (isOwner ? "Business" : "My workspace") + "</div>" +
        items.map((it) =>
          '<button class="' + (tab === it[0] ? "active" : "") + '" onclick="App.setTab(\'' + it[0] + '\')">' +
          '<span class="ico">' + I(it[2], 19) + "</span>" + it[1] + "</button>").join("") +
        '<div class="side-spacer"></div>' +
        '<div class="side-group">Signed in as</div>' +
        '<div style="padding:6px 12px;display:flex;align-items:center;gap:10px">' +
          '<div class="avatar" style="background:' + user.color + '">' + initials(user.name) + "</div>" +
          '<div><div style="font-weight:600;font-size:13px">' + H(user.name.split(" ")[0]) + "</div>" +
          '<div style="font-size:11px;color:var(--ink-soft)">' + (isOwner ? "Owner" : "Aesthetician") + "</div></div>" +
        "</div>" +
      "</div>";

    let body = "";
    if (isOwner) {
      if (tab === "overview") body = ownerOverview();
      else if (tab === "revenue") body = ownerRevenue();
      else if (tab === "services") body = ownerServices();
      else if (tab === "team") body = ownerTeam();
      else if (tab === "clients") body = ownerClients();
      else if (tab === "waitlist") body = waitlistPage(true);
    } else {
      if (tab === "day") body = staffDay(user);
      else if (tab === "schedule") body = staffSchedule(user);
      else if (tab === "earnings") body = staffEarnings(user);
      else if (tab === "waitlist") body = waitlistPage(false);
    }
    return '<div class="with-side">' + side + '<div class="main">' + body + "</div></div>";
  }

  /* ---------------- analytics helpers ---------------- */
  function nowMs() { return SB.state.now; }
  function range(daysBack, daysBackEnd) {
    const end = nowMs() - (daysBackEnd || 0) * SB.DAY;
    const start = nowMs() - daysBack * SB.DAY;
    return [start, end];
  }
  function completed(from, to, staffId) { return SB.completedInRange(from, to, staffId); }
  function sum(arr, f) { return arr.reduce((s, x) => s + f(x), 0); }

  /* ---------------- line-icon set (professional SVG, inherit currentColor) ---------------- */
  const ICON_PATHS = {
    grid:     '<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>',
    wallet:   '<rect x="3" y="6" width="18" height="13" rx="2.6"/><path d="M3 10.5h18"/><circle cx="16.5" cy="14.5" r="1.25"/>',
    trend:    '<path d="M3 17l5.5-5.5 3.5 3.5L21 6"/><path d="M21 11V6h-5"/>',
    target:   '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.6" fill="currentColor" stroke="none"/>',
    heart:    '<path d="M12 20s-6.8-4.2-9-8.1C1.4 8.9 3 5.6 6 5.6c1.9 0 3.1 1.1 4 2.3.9-1.2 2.1-2.3 4-2.3 3 0 4.6 3.3 3 6.3-2.2 3.9-9 8.1-9 8.1z"/>',
    bottle:   '<path d="M9.5 3.5h5M10.5 3.5v2.5M13.5 3.5v2.5"/><path d="M8.5 9c0-1.7 1.3-3 3.5-3s3.5 1.3 3.5 3v9.5a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2V9z"/><path d="M8.5 13h7"/>',
    users:    '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19.5c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2"/><path d="M16 5.2a3.2 3.2 0 0 1 0 6"/><path d="M17.5 14.6c2 .7 3.3 2.5 3.3 4.9"/>',
    repeat:   '<path d="M4 10a6.5 6.5 0 0 1 11-3l2 2"/><path d="M20 14a6.5 6.5 0 0 1-11 3l-2-2"/><path d="M17 5v4h-4M7 19v-4h4"/>',
    sparkle:  '<path d="M12 3l1.9 5.4L19 10l-5.1 1.6L12 17l-1.9-5.4L5 10l5.1-1.6z"/><path d="M18.5 15.5l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z"/>',
    star:     '<path d="M12 3.5l2.6 5.3 5.8.9-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.4 9.7l5.8-.9z"/>',
    bell:     '<path d="M6 9.5a6 6 0 0 1 12 0c0 4.5 1.8 5.8 1.8 5.8H4.2S6 14 6 9.5z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
    check:    '<circle cx="12" cy="12" r="8.5"/><path d="M8.4 12.3l2.4 2.4 4.7-4.9"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17"/><path d="M8 3v4M16 3v4"/>',
    droplet:  '<path d="M12 3.2c3.4 3.9 5.8 6.6 5.8 9.8a5.8 5.8 0 0 1-11.6 0c0-3.2 2.4-5.9 5.8-9.8z"/>',
    sun:      '<circle cx="12" cy="12" r="3.8"/><path d="M12 2.5v2.4M12 19.1v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7"/>',
    bars:     '<path d="M4 20.5h16"/><rect x="5.5" y="11" width="3" height="8" rx="1"/><rect x="10.5" y="6.5" width="3" height="12.5" rx="1"/><rect x="15.5" y="14" width="3" height="5" rx="1"/>',
    clock:    '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.3V12l3.1 1.9"/>',
    gem:      '<path d="M5.5 4h13l3 5-9.5 11L2.5 9z"/><path d="M2.5 9h19M8.5 4 6 9l6 11M15.5 4 18 9l-6 11"/>',
  };
  function I(name, size) {
    const s = size || 20;
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + (ICON_PATHS[name] || "") + "</svg>";
  }

  function kpiCard(label, value, ico, icoBg, foot) {
    const tone = {
      "var(--rose-soft)": "var(--rose-deep)",
      "#E5F0E4": "var(--green)",
      "#ECE8F5": "var(--violet)",
      "#FBEFD9": "var(--amber)",
    }[icoBg] || "var(--rose-deep)";
    return (
      '<div class="card kpi">' +
        '<div class="k-ico" style="background:' + icoBg + ";color:" + tone + '">' + ico + "</div>" +
        '<div class="k-label">' + label + "</div>" +
        '<div class="k-value">' + value + "</div>" +
        (foot ? '<div class="k-foot">' + foot + "</div>" : "") +
      "</div>"
    );
  }
  function delta(cur, prev) {
    if (!prev) return '<span class="trend-up">new</span>';
    const p = ((cur - prev) / prev) * 100;
    const cls = p >= 0 ? "trend-up" : "trend-down";
    const arrow = p >= 0 ? "▲" : "▼";
    return '<span class="' + cls + '">' + arrow + " " + Math.abs(p).toFixed(0) + "%</span> <span class=\"muted\">vs prev 30d</span>";
  }

  /* ================================================================
     OWNER: OVERVIEW
     ================================================================ */
  function ownerOverview() {
    const [m0, m1] = range(30, 0);
    const [p0, p1] = range(60, 30);
    const cur = completed(m0, m1);
    const prev = completed(p0, p1);
    const rev = sum(cur, SB.apptRevenue), revPrev = sum(prev, SB.apptRevenue);
    const profit = sum(cur, SB.apptProfit), profitPrev = sum(prev, SB.apptProfit);
    const avg = cur.length ? rev / cur.length : 0;

    // new clients this month
    const newC = SB.state.clients.filter((c) => c.since >= m0 && c.since < m1).length;
    // waitlist recovered revenue (all time)
    const recovered = sum(SB.state.appts.filter((a) => a.fromWaitlist && a.status === "completed"), SB.apptRevenue);
    const upcoming = SB.state.appts.filter((a) => a.status === "booked" && a.start >= nowMs()).length;

    // revenue trend last 12 weeks
    const weeks = [];
    for (let w = 11; w >= 0; w--) {
      const [f, t] = range((w + 1) * 7, w * 7);
      const c = completed(f, t);
      weeks.push({ y: sum(c, SB.apptRevenue), label: "w-" + w });
    }
    const trend = Charts.line([{ points: weeks.map((p, i) => ({ y: p.y, label: i % 2 ? "" : (12 - i) + "w" })), color: "var(--rose)" }],
      { height: 200, yfmt: (v) => "£" + Math.round(v / 1000) + "k" });

    // category revenue donut
    const catRev = {};
    completed(range(30,0)[0], range(30,0)[1]).forEach((a) => {
      const cat = SB.serviceById(a.serviceId).category;
      catRev[cat] = (catRev[cat] || 0) + a.price;
    });
    const segs = Object.keys(catRev).sort((a,b)=>catRev[b]-catRev[a]).map((c) =>
      ({ label: SB.CATEGORIES[c].label, value: catRev[c], color: SB.CATEGORIES[c].color }));
    const donut = Charts.donut(segs, { center: M(rev), centerSub: "30-day", format: (v) => M(v) });

    // busiest weekday
    const dowLoad = [0,0,0,0,0,0,0];
    completed(range(90,0)[0], range(90,0)[1]).forEach((a) => { dowLoad[new Date(a.start).getDay()]++; });
    const dnames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const cols = Charts.columns(dnames.map((d, i) => ({ label: d, value: dowLoad[i], color: i === 6 ? "var(--rose-deep)" : "var(--rose)" })), { height: 180 });

    // operations metrics (last 90 days)
    const [q0, q1] = range(90, 0);
    const q = SB.state.appts.filter((a) => a.start >= q0 && a.start < q1);
    const qDone = q.filter((a) => a.status === "completed").length;
    const qCancel = q.filter((a) => a.status === "cancelled").length;
    const qNoShow = q.filter((a) => a.status === "no-show").length;
    const qTotal = qDone + qCancel + qNoShow;
    const cancelRate = qTotal ? (qCancel / qTotal) * 100 : 0;
    const noShowRate = qTotal ? (qNoShow / qTotal) * 100 : 0;
    const rebook = SB.state.clients.filter((c) => c.visits >= 2).length /
      Math.max(1, SB.state.clients.filter((c) => c.visits >= 1).length) * 100;
    // chair utilisation last 30d: booked hours vs capacity (4 chairs x 6 days x 7h x ~4.3wk)
    const bookedHrs = sum(cur, (a) => a.mins) / 60;
    const capacityHrs = SB.STAFF.length * 6 * 7 * 4.3;
    const utilisation = Math.min(100, (bookedHrs / capacityHrs) * 100);

    // busiest times heatmap: days (Mon-Sat) x hours (10-18)
    const hours = [10,11,12,13,14,15,16,17,18];
    const dayIdx = [1,2,3,4,5,6];
    const dLabels = ["Mon","Tue","Wed","Thu","Fri","Sat"];
    const matrix = dayIdx.map(() => hours.map(() => 0));
    completed(q0, q1).forEach((a) => {
      const dt = new Date(a.start), di = dayIdx.indexOf(dt.getDay()), hi = hours.indexOf(dt.getHours());
      if (di >= 0 && hi >= 0) matrix[di][hi]++;
    });
    const heat = Charts.heatmap(matrix, dLabels, hours.map((h) => (h > 12 ? (h - 12) : h) + (h >= 12 ? "p" : "a")), { fmt: (v) => v + " treatments" });
    // quietest window, considering only hours the clinic clearly operates
    const colSums = hours.map((_, hi) => dayIdx.reduce((s, _2, di) => s + matrix[di][hi], 0));
    const maxCol = Math.max(1, ...colSums);
    let quiet = { v: Infinity, d: 0, h: 0 };
    matrix.forEach((row, di) => row.forEach((v, hi) => {
      if (colSums[hi] < maxCol * 0.3) return; // ignore effectively-closed hours
      if (v < quiet.v) quiet = { v, d: di, h: hi };
    }));
    if (quiet.v === Infinity) quiet = { v: 0, d: 0, h: 0 };

    // profit per hour by service, to surface a pricing insight
    const svcPH = {};
    completed(q0, q1).forEach((a) => {
      const s = SB.serviceById(a.serviceId);
      if (!svcPH[s.id]) svcPH[s.id] = { s, profit: 0, hrs: 0, count: 0 };
      svcPH[s.id].profit += SB.apptProfit(a); svcPH[s.id].hrs += a.mins / 60; svcPH[s.id].count++;
    });
    const phRows = Object.values(svcPH).filter((r) => r.count >= 3);
    const topPH = phRows.slice().sort((a, b) => (b.profit / b.hrs) - (a.profit / a.hrs))[0];
    const topCount = phRows.slice().sort((a, b) => b.count - a.count)[0];

    const insights = [];
    if (topPH) insights.push({ ic: "gem", tone: "rose", text: "<b>" + H(topPH.s.name) + "</b> earns the most profit per hour (" + M(topPH.profit / topPH.hrs) + "/hr). Worth featuring in promotions." });
    if (topCount && topPH && topCount.s.id !== topPH.s.id) insights.push({ ic: "bars", tone: "violet", text: "<b>" + H(topCount.s.name) + "</b> is your most booked, but it earns less per hour than " + H(topPH.s.name) + ". A small price review could lift margin." });
    insights.push({ ic: "clock", tone: "amber", text: "Your quietest window is <b>" + dLabels[quiet.d] + " " + (hours[quiet.h] > 12 ? hours[quiet.h] - 12 : hours[quiet.h]) + (hours[quiet.h] >= 12 ? "pm" : "am") + "</b>. A last-minute offer here could fill dead time." });
    if (recovered > 0) insights.push({ ic: "repeat", tone: "green", text: "The smart waitlist has recovered <b>" + M(recovered) + "</b> from cancellations that would otherwise be empty chairs." });
    const insightTone = { rose: ["var(--rose-soft)", "var(--rose-deep)"], violet: ["#ECE8F5", "var(--violet)"], amber: ["#FBEFD9", "var(--amber)"], green: ["#E5F0E4", "var(--green)"], teal: ["#E1F0ED", "var(--teal)"] };
    const insightHtml = insights.map((o) => {
      const t = insightTone[o.tone] || insightTone.rose;
      return '<div class="insight"><div class="insight-ico" style="background:' + t[0] + ";color:" + t[1] + '">' + I(o.ic, 19) + "</div><div class=\"insight-txt\">" + o.text + "</div></div>";
    }).join("");

    return (
      '<div class="page-head"><h1>Good morning, Sandy</h1><p>Here is how the clinic is performing over the last 30 days.</p></div>' +
      '<div class="grid g4">' +
        kpiCard("Revenue (30d)", M(rev), I("wallet"), "var(--rose-soft)", delta(rev, revPrev)) +
        kpiCard("Net profit (30d)", M(profit), I("trend"), "#E5F0E4", delta(profit, profitPrev)) +
        kpiCard("Avg. treatment value", M(avg), I("target"), "#ECE8F5", '<span class="muted">' + cur.length + " treatments</span>") +
        kpiCard("New clients", newC, I("heart"), "#FBEFD9", '<span class="muted">' + upcoming + " upcoming appts</span>") +
      "</div>" +
      '<div class="card" style="margin-top:18px"><div class="stat-inline" style="justify-content:space-between">' +
        '<div><div class="si-v">' + utilisation.toFixed(0) + '%</div><div class="si-l">Chair utilisation</div></div>' +
        '<div><div class="si-v">' + rebook.toFixed(0) + '%</div><div class="si-l">Clients who rebook</div></div>' +
        '<div><div class="si-v">' + cancelRate.toFixed(1) + '%</div><div class="si-l">Cancellation rate</div></div>' +
        '<div><div class="si-v">' + noShowRate.toFixed(1) + '%</div><div class="si-l">No-show rate</div></div>' +
        '<div><div class="si-v">' + M(recovered) + '</div><div class="si-l">Recovered by waitlist</div></div>' +
      "</div></div>" +
      '<div class="grid g3" style="margin-top:18px">' +
        '<div class="card span2"><h3>Revenue trend</h3><div class="card-sub">Completed treatment income, last 12 weeks</div>' + trend + "</div>" +
        '<div class="card"><h3>Where revenue comes from</h3><div class="card-sub">By category, last 30 days</div>' + donut + "</div>" +
      "</div>" +
      '<div class="grid g3" style="margin-top:18px">' +
        '<div class="card span2"><h3>Busiest times of the week</h3><div class="card-sub">Darker means busier. Last 90 days. Spot the gaps worth filling.</div>' + heat + "</div>" +
        '<div class="card"><h3>Busiest days</h3><div class="card-sub">Treatments by weekday</div>' + cols + "</div>" +
      "</div>" +
      '<div class="card insights-card" style="margin-top:18px"><div class="insights-head"><div class="insights-badge">' + I("sparkle") + '</div><div><h3>Smart insights</h3><div class="card-sub" style="margin-bottom:0">Automatically spotted opportunities in your numbers</div></div></div><div class="insights-grid">' + insightHtml + "</div></div>"
    );
  }

  /* ================================================================
     OWNER: REVENUE
     ================================================================ */
  function ownerRevenue() {
    const [m0, m1] = range(30, 0);
    const cur = completed(m0, m1);
    const rev = sum(cur, SB.apptRevenue);
    const cost = sum(cur, SB.apptCost);
    const comm = sum(cur, SB.apptCommission);
    const profit = rev - cost - comm;

    // monthly revenue last 6 months
    const months = [];
    for (let mo = 5; mo >= 0; mo--) {
      const [f, t] = range((mo + 1) * 30, mo * 30);
      const c = completed(f, t);
      const d = new Date(t - SB.DAY);
      months.push({ label: d.toLocaleDateString("en-GB", { month: "short" }), rev: sum(c, SB.apptRevenue), profit: sum(c, SB.apptProfit) });
    }
    const dual = Charts.line([
      { points: months.map((m) => ({ y: m.rev, label: m.label })), color: "var(--rose)" },
      { points: months.map((m) => ({ y: m.profit, label: m.label })), color: "var(--green)", fill: false },
    ], { height: 240, yfmt: (v) => "£" + Math.round(v / 1000) + "k" });

    const catRows = catBreakdown(cur).map((r) =>
      ({ label: r.label, value: r.rev, color: r.color }));

    // revenue by location (last 30 days)
    const locRev = {};
    cur.forEach((a) => { locRev[a.locationId] = (locRev[a.locationId] || 0) + a.price; });
    const locRows = SB.LOCATIONS.map((L) => ({ label: L.name, value: locRev[L.id] || 0, color: L.color })).sort((a, b) => b.value - a.value);

    return (
      '<div class="page-head"><h1>Revenue &amp; profit</h1><p>The full money picture, with product costs and practitioner pay already deducted.</p></div>' +
      '<div class="grid g4">' +
        kpiCard("Gross revenue (30d)", M(rev), I("wallet"), "var(--rose-soft)", '<span class="muted">' + cur.length + " treatments</span>") +
        kpiCard("Product / consumables", "-" + M(cost), I("bottle"), "#FBEFD9", '<span class="muted">' + (rev? (cost/rev*100).toFixed(0):0) + "% of revenue</span>") +
        kpiCard("Practitioner pay", "-" + M(comm), I("users"), "#ECE8F5", '<span class="muted">commission to your team</span>') +
        kpiCard("Net profit (30d)", M(profit), I("trend"), "#E5F0E4", '<span class="pill pill-green">' + (rev?(profit/rev*100).toFixed(0):0) + "% margin</span>") +
      "</div>" +
      '<div class="card" style="margin-top:18px"><h3>Revenue vs net profit</h3><div class="card-sub">Last 6 months · <span style="color:var(--rose)">● revenue</span>  <span style="color:var(--green)">● profit</span></div>' + dual + "</div>" +
      '<div class="grid g3" style="margin-top:18px">' +
        '<div class="card"><h3>Revenue by category</h3><div class="card-sub">Last 30 days</div>' + Charts.bars(catRows, { format: M }) + "</div>" +
        '<div class="card"><h3>Profit by category</h3><div class="card-sub">After product cost &amp; pay</div>' +
          Charts.bars(catBreakdown(cur).sort((a,b)=>b.profit-a.profit).map((r) => ({ label: r.label, value: r.profit, color: r.color })), { format: M }) + "</div>" +
        '<div class="card"><h3>Revenue by location</h3><div class="card-sub">Which branch earns most</div>' + Charts.bars(locRows, { format: M }) + "</div>" +
      "</div>"
    );
  }

  function catBreakdown(appts) {
    const map = {};
    appts.forEach((a) => {
      const s = SB.serviceById(a.serviceId), cat = s.category;
      if (!map[cat]) map[cat] = { label: SB.CATEGORIES[cat].label, color: SB.CATEGORIES[cat].color, rev: 0, profit: 0, count: 0 };
      map[cat].rev += a.price; map[cat].profit += SB.apptProfit(a); map[cat].count++;
    });
    return Object.values(map).sort((a, b) => b.rev - a.rev);
  }

  /* ================================================================
     OWNER: SERVICES / TREATMENTS
     ================================================================ */
  function ownerServices() {
    const [m0, m1] = range(30, 0);
    const [q0, q1] = range(90, 0);
    const cur = completed(q0, q1);
    const bySvc = {};
    cur.forEach((a) => {
      const s = SB.serviceById(a.serviceId);
      if (!bySvc[s.id]) bySvc[s.id] = { svc: s, count: 0, rev: 0, profit: 0 };
      bySvc[s.id].count++; bySvc[s.id].rev += a.price; bySvc[s.id].profit += SB.apptProfit(a);
    });
    const rows = Object.values(bySvc);
    const byPop = [...rows].sort((a, b) => b.count - a.count);
    const byProfit = [...rows].sort((a, b) => b.profit - a.profit);
    const mostPop = byPop[0], mostProfit = byProfit[0];

    const popBars = Charts.bars(byPop.slice(0, 8).map((r) => ({ label: r.svc.name, value: r.count, color: SB.CATEGORIES[r.svc.category].color })), { format: (v) => v + "×" });
    const profitBars = Charts.bars(byProfit.slice(0, 8).map((r) => ({ label: r.svc.name, value: r.profit, color: SB.CATEGORIES[r.svc.category].color })), { format: M });

    const table = byProfit.map((r) => {
      const margin = r.rev ? (r.profit / r.rev * 100) : 0;
      return "<tr><td><b>" + H(r.svc.name) + '</b><br><span class="muted" style="font-size:12px">' + H(SB.CATEGORIES[r.svc.category].label) + "</span></td>" +
        '<td class="num">' + r.count + "</td>" +
        '<td class="num">' + M(r.rev) + "</td>" +
        '<td class="num">' + M(r.profit) + "</td>" +
        '<td class="num"><span class="pill ' + (margin > 70 ? "pill-green" : margin > 45 ? "pill-amber" : "pill-red") + '">' + margin.toFixed(0) + "%</span></td></tr>";
    }).join("");

    return (
      '<div class="page-head"><h1>Treatment performance</h1><p>Which treatments fill your book, and which quietly make you the most money. Last 90 days.</p></div>' +
      '<div class="grid g2">' +
        '<div class="card" style="background:linear-gradient(140deg,var(--rose-soft),#fff)"><div class="k-label">⭐ Most popular treatment</div>' +
          '<div class="serif" style="font-size:28px;margin:6px 0 2px">' + H(mostPop.svc.name) + "</div>" +
          '<div class="muted">Booked <b>' + mostPop.count + "</b> times · " + M(mostPop.rev) + " revenue</div></div>" +
        '<div class="card" style="background:linear-gradient(140deg,#E5F0E4,#fff)"><div class="k-label">💎 Most profitable treatment</div>' +
          '<div class="serif" style="font-size:28px;margin:6px 0 2px">' + H(mostProfit.svc.name) + "</div>" +
          '<div class="muted"><b>' + M(mostProfit.profit) + "</b> profit · " + (mostProfit.rev?(mostProfit.profit/mostProfit.rev*100).toFixed(0):0) + "% margin</div></div>" +
      "</div>" +
      '<div class="grid g2" style="margin-top:18px">' +
        '<div class="card"><h3>Most booked</h3><div class="card-sub">By number of treatments</div>' + popBars + "</div>" +
        '<div class="card"><h3>Biggest profit earners</h3><div class="card-sub">Revenue minus product cost &amp; pay</div>' + profitBars + "</div>" +
      "</div>" +
      '<div class="card" style="margin-top:18px"><h3>Full treatment breakdown</h3><div class="card-sub">Ranked by profit contribution</div>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Treatment</th><th class="num">Booked</th><th class="num">Revenue</th><th class="num">Profit</th><th class="num">Margin</th></tr></thead><tbody>' +
        table + "</tbody></table></div></div>"
    );
  }

  /* ================================================================
     OWNER: TEAM
     ================================================================ */
  function ownerTeam() {
    const [m0, m1] = range(30, 0);
    const staffRows = SB.STAFF.map((st) => {
      const c = completed(m0, m1, st.id);
      const rev = sum(c, SB.apptRevenue);
      const pay = st.role === "owner" ? 0 : sum(c, SB.apptCommission);
      const profit = sum(c, SB.apptProfit);
      const hours = sum(c, (a) => a.mins) / 60;
      return { st, count: c.length, rev, pay, profit, hours };
    }).sort((a, b) => b.rev - a.rev);

    const leader = staffRows.map((r) => ({ label: r.st.name.split(" ")[0], value: r.rev, color: r.st.color }));
    const bars = Charts.bars(leader, { format: M });

    const cards = staffRows.map((r) => {
      const util = Math.min(100, (r.hours / 130) * 100); // ~130 productive hrs/month benchmark
      return (
        '<div class="card">' +
          '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">' +
            '<div class="avatar" style="width:44px;height:44px;background:' + r.st.color + '">' + initials(r.st.name) + "</div>" +
            '<div><div style="font-weight:600">' + H(r.st.name) + "</div><div class=\"muted\" style=\"font-size:12px\">" + H(r.st.title) + "</div></div>" +
            (r.st.role === "owner" ? '<span class="pill pill-rose" style="margin-left:auto">Owner</span>' : '<span class="pill pill-violet" style="margin-left:auto">' + (r.st.commissionRate*100) + "% comm</span>") +
          "</div>" +
          '<div class="stat-inline">' +
            '<div><div class="si-v">' + r.count + '</div><div class="si-l">treatments</div></div>' +
            '<div><div class="si-v">' + M(r.rev) + '</div><div class="si-l">revenue generated</div></div>' +
            '<div><div class="si-v">' + (r.st.role === "owner" ? "n/a" : M(r.pay)) + '</div><div class="si-l">' + (r.st.role==="owner"?"owner":"take-home pay") + '</div></div>' +
          "</div>" +
          '<div style="margin-top:14px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px"><span class="muted">Utilisation</span><span style="font-weight:600">' + util.toFixed(0) + "%</span></div>" +
          '<div class="c-bar-track"><div class="c-bar-fill" style="width:' + util + "%;background:" + r.st.color + '"></div></div></div>' +
        "</div>"
      );
    }).join("");

    return (
      '<div class="page-head"><h1>My team</h1><p>Workload, revenue and pay for each practitioner. Last 30 days.</p></div>' +
      '<div class="card"><h3>Revenue by practitioner</h3><div class="card-sub">Who is bringing money through the door</div>' + bars + "</div>" +
      '<div class="grid g2" style="margin-top:18px">' + cards + "</div>"
    );
  }

  /* ================================================================
     OWNER: CLIENTS
     ================================================================ */
  function ownerClients() {
    const clients = [...SB.state.clients].filter((c) => c.visits > 0).sort((a, b) => b.spend - a.spend);
    const total = SB.state.clients.length;
    const returning = SB.state.clients.filter((c) => c.visits >= 2).length;
    const [m0, m1] = range(30, 0);
    const newC = SB.state.clients.filter((c) => c.since >= m0 && c.since < m1).length;
    const avgSpend = clients.length ? sum(clients, (c) => c.spend) / clients.length : 0;

    const top = clients.slice(0, 12).map((c, i) =>
      '<tr><td>' + (i < 3 ? ["🥇","🥈","🥉"][i] + " " : "") + "<b>" + H(c.name) + '</b></td>' +
      '<td class="num">' + c.visits + "</td>" +
      '<td class="num">' + M(c.spend) + "</td>" +
      '<td class="num muted">' + SB.fmtDate(new Date(c.since)) + "</td></tr>").join("");

    return (
      '<div class="page-head"><h1>Clients</h1><p>Your running client book, ranked by lifetime value.</p></div>' +
      '<div class="grid g4">' +
        kpiCard("Total clients", total, I("heart"), "#FBEFD9", "") +
        kpiCard("Returning clients", returning, I("repeat"), "#E5F0E4", '<span class="muted">' + (total?(returning/total*100).toFixed(0):0) + "% retention</span>") +
        kpiCard("New (30d)", newC, I("sparkle"), "var(--rose-soft)", "") +
        kpiCard("Avg. lifetime spend", M(avgSpend), I("wallet"), "#ECE8F5", "") +
      "</div>" +
      '<div class="card" style="margin-top:18px"><h3>Top clients</h3><div class="card-sub">Your most valuable regulars</div>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Client</th><th class="num">Visits</th><th class="num">Lifetime spend</th><th class="num">Client since</th></tr></thead><tbody>' +
        top + "</tbody></table></div></div>"
    );
  }

  /* ================================================================
     WAITLIST PAGE (owner + staff share, owner can act)
     ================================================================ */
  function waitlistPage(isOwner) {
    const wl = SB.state.waitlist;
    const waiting = wl.filter((w) => w.status === "waiting").length;
    const offered = wl.filter((w) => w.status === "offered").length;
    const booked = wl.filter((w) => w.status === "booked").length;
    const recovered = sum(SB.state.appts.filter((a) => a.fromWaitlist && a.status === "completed"), SB.apptRevenue);

    // group by status ordering
    const order = { offered: 0, waiting: 1, booked: 2, passed: 3 };
    const sorted = [...wl].sort((a, b) => (order[a.status] - order[b.status]) || (a.createdAt - b.createdAt));

    const items = sorted.map((w, i) => {
      const c = SB.clientById(w.clientId);
      const svc = SB.serviceById(w.serviceId);
      let meta = '<span class="muted">joined ' + SB.fmtDate(new Date(w.createdAt)) + "</span>";
      let cls = w.status;
      if (w.status === "offered") {
        const left = Math.max(0, w.offerExpires - nowMs());
        const hrs = Math.floor(left / SB.HOUR), mins = Math.floor((left % SB.HOUR) / 60000);
        meta = '<span class="countdown">⏳ ' + hrs + "h " + mins + "m to claim</span>";
      } else if (w.status === "booked") {
        meta = '<span class="pill pill-green">✓ Claimed &amp; booked</span>';
      } else if (w.status === "passed") {
        meta = '<span class="muted">Passed (no response)</span>';
      }
      const action = (w.status === "offered")
        ? '<button class="btn btn-primary btn-sm" onclick="App.openClaim(\'' + w.id + '\')">📱 Open offer</button>'
        : "";
      const wLoc = (!w.locationId || w.locationId === "any") ? "Any location" : (SB.locationById(w.locationId) || {}).name;
      return (
        '<div class="q-item ' + cls + '">' +
          '<div class="q-pos">' + (i + 1) + "</div>" +
          '<div class="q-main"><div class="q-name">' + H(c ? c.name : "Client") + "</div>" +
            '<div class="q-svc">' + H(svc.name) + " · 📍 " + H(wLoc) + (w.note ? " · " + H(w.note) : "") + "</div></div>" +
          '<div class="q-meta">' + meta + "</div>" +
          (action ? '<div style="margin-left:10px">' + action + "</div>" : "") +
        "</div>"
      );
    }).join("");

    const explain =
      '<div class="callout info"><span>⚙️</span><div><b>How the automation works:</b> when a client cancels, the freed slot is instantly offered to the first 3 people on the matching waitlist by text and email. They have 24 hours to claim it. If nobody does, it cascades to the next 3, and so on, until the slot is filled. No more empty chairs, no manual chasing.</div></div>';

    return (
      '<div class="page-head"><h1>Smart waitlist</h1><p>Turning cancellations into revenue, automatically.</p></div>' +
      '<div class="grid g4">' +
        kpiCard("Waiting", waiting, I("star"), "var(--rose-soft)", "") +
        kpiCard("Live offers out", offered, I("bell"), "#FBEFD9", '<span class="muted">24h to claim</span>') +
        kpiCard("Claimed from waitlist", booked, I("check"), "#E5F0E4", "") +
        kpiCard("Revenue rescued", M(recovered), I("wallet"), "#ECE8F5", '<span class="muted">all time</span>') +
      "</div>" +
      '<div style="margin-top:18px">' + explain + "</div>" +
      '<div class="grid ' + (isOwner ? "g2" : "g1") + '" style="margin-top:18px">' +
        '<div class="card"><h3>The queue</h3><div class="card-sub">Live waitlist, ordered by priority</div><div class="queue">' + (items || '<p class="muted">No one waiting.</p>') + "</div></div>" +
        (isOwner ? '<div class="card"><h3>Try it live</h3><div class="card-sub">Cancel an upcoming appointment and watch the slot cascade down the queue</div>' + cancelPanel() + "</div>" : "") +
      "</div>"
    );
  }

  function cancelPanel() {
    const upcoming = SB.state.appts
      .filter((a) => a.status === "booked" && a.start >= nowMs())
      .map((a) => ({ a, waiters: SB.matchingWaiters({ serviceId: a.serviceId, locationId: a.locationId }).length }))
      .sort((x, y) => (y.waiters - x.waiters) || (x.a.start - y.a.start))
      .slice(0, 6);
    if (!upcoming.length) return '<p class="muted">No upcoming booked appointments to cancel.</p>';
    const rows = upcoming.map((row) => {
      const a = row.a;
      const c = SB.clientById(a.clientId), s = SB.serviceById(a.serviceId), st = SB.staffById(a.staffId);
      const badge = row.waiters
        ? '<span class="pill pill-rose">' + row.waiters + " waiting</span>"
        : '<span class="pill pill-amber">no waitlist</span>';
      return (
        '<div class="q-item"><div class="q-main"><div class="q-name">' + H(s.name) + " " + badge + "</div>" +
        '<div class="q-svc">' + H(c ? c.name : "") + " · " + SB.fmtDay(new Date(a.start)) + " " + SB.fmtTime(new Date(a.start)) + " · " + H(st.name.split(" ")[0]) + "</div></div>" +
        '<button class="btn btn-ghost btn-sm" onclick="App.simCancel(\'' + a.id + '\')">Cancel this</button></div>'
      );
    }).join("");
    return '<div class="queue">' + rows + "</div>" +
      '<div class="callout warn" style="margin-top:12px"><span>💡</span><div>Cancel one with people <b>waiting</b>, then use <b>Advance 24h</b> in the demo dock (bottom right) to watch unclaimed offers cascade to the next three clients.</div></div>';
  }

  /* ================================================================
     STAFF: MY DAY
     ================================================================ */
  function staffDay(user) {
    const dayStart = SB.startOfDay(SB.now()).getTime();
    const dayEnd = dayStart + SB.DAY;
    const today = SB.state.appts.filter((a) =>
      a.staffId === user.id && a.start >= dayStart && a.start < dayEnd &&
      (a.status === "booked" || a.status === "completed")).sort((a, b) => a.start - b.start);

    const [w0, w1] = weekRange();
    const [mo0, mo1] = range(30, 0);
    const dayC = completed(dayStart, dayEnd, user.id).concat(today.filter(a=>a.status==="booked"));
    const dayRev = sum(today, SB.apptRevenue);
    const dayPay = user.role === "owner" ? dayRev : sum(today, SB.apptCommission);
    const weekBooked = SB.bookedInRange(w0, w1, user.id);
    const weekPay = user.role === "owner" ? sum(weekBooked, SB.apptRevenue) : sum(weekBooked, SB.apptCommission);
    const monthBooked = SB.bookedInRange(mo0, mo1, user.id);
    const monthPay = user.role === "owner" ? sum(monthBooked, SB.apptRevenue) : sum(monthBooked, SB.apptCommission);

    const schedule = today.length ? today.map((a) => {
      const c = SB.clientById(a.clientId), s = SB.serviceById(a.serviceId), L = SB.locationById(a.locationId);
      const isNext = a.status === "booked" && a.start >= nowMs();
      return (
        '<div class="q-item' + (isNext ? " q-next" : "") + '"><div class="q-pos" style="background:' + SB.CATEGORIES[s.category].color + ';color:#fff">' + SB.fmtTime(new Date(a.start)).replace(":00","") + "</div>" +
        '<div class="q-main"><div class="q-name">' + H(s.name) + (a.fromWaitlist ? ' <span class="pill pill-rose">from waitlist</span>' : "") + (L ? ' <span class="loc-badge" style="background:' + L.color + '22;color:' + L.color + '">📍 ' + H(L.name) + "</span>" : "") + "</div>" +
        '<div class="q-svc">' + H(c ? c.name : "") + " · " + s.mins + " min</div></div>" +
        '<div class="q-meta"><div style="font-weight:600">' + M(a.price) + "</div>" +
        '<span class="status s-' + a.status + '">' + a.status + "</span></div></div>"
      );
    }).join("") : '<div class="slot-none">No appointments today. Enjoy the breather.</div>';

    // next appointment (today or future)
    const nextAppt = SB.state.appts.filter((a) => a.staffId === user.id && a.status === "booked" && a.start >= nowMs())
      .sort((a, b) => a.start - b.start)[0];
    let nextHtml = '<div class="card"><h3>Next appointment</h3><div class="card-sub">Nothing booked yet</div><div class="slot-none">You are all clear.</div></div>';
    if (nextAppt) {
      const nc = SB.clientById(nextAppt.clientId), ns = SB.serviceById(nextAppt.serviceId);
      const mins = Math.round((nextAppt.start - nowMs()) / 60000);
      const when = mins < 60 ? "in " + mins + " min" : (SB.sameDay(new Date(nextAppt.start), SB.now()) ? "at " + SB.fmtTime(new Date(nextAppt.start)) : SB.fmtDay(new Date(nextAppt.start)) + ", " + SB.fmtTime(new Date(nextAppt.start)));
      nextHtml = '<div class="card" style="background:linear-gradient(140deg,var(--rose-soft),#fff)"><h3>Next appointment</h3>' +
        '<div class="card-sub">' + when + "</div>" +
        '<div class="serif" style="font-size:24px;margin-top:4px">' + H(ns.name) + "</div>" +
        '<div class="muted">' + H(nc ? nc.name : "") + " · " + ns.mins + " min · " + M(nextAppt.price) + "</div></div>";
    }

    // monthly target ring
    const target = user.monthlyTarget || 3000;
    const pct = monthPay / target;
    const ring = Charts.ring(pct, { center: (pct * 100).toFixed(0) + "%", sub: "of target", color: user.color });
    const targetHtml = '<div class="card"><h3>Monthly target</h3><div class="card-sub">' + (user.role === "owner" ? "Profit" : "Take-home pay") + " goal</div>" +
      '<div style="display:flex;align-items:center;gap:16px">' + ring +
      '<div><div class="serif" style="font-size:26px">' + M(monthPay) + "</div>" +
      '<div class="muted" style="font-size:13px">of ' + M(target) + " target</div>" +
      '<div class="muted" style="font-size:13px;margin-top:4px">' + (monthPay >= target ? "🎉 Target smashed" : M(target - monthPay) + " to go") + "</div></div></div></div>";

    return (
      '<div class="page-head"><h1>Hi ' + H(user.name.split(" ")[0]) + " ☀️</h1><p>" + SB.fmtDate(SB.now()) + " · you have <b>" + today.length + "</b> appointments today.</p></div>" +
      '<div class="grid g3">' +
        kpiCard("Today", today.length + " appts", I("sun"), "var(--rose-soft)", '<span class="muted">' + M(dayPay) + (user.role==="owner"?" revenue":" your pay") + "</span>") +
        kpiCard("This week", weekBooked.length + " appts", I("calendar"), "#ECE8F5", '<span class="muted">' + M(weekPay) + (user.role==="owner"?" revenue":" your pay") + "</span>") +
        kpiCard("This month", monthBooked.length + " appts", I("trend"), "#E5F0E4", '<span class="muted">' + M(monthPay) + (user.role==="owner"?" revenue":" your pay") + "</span>") +
      "</div>" +
      '<div class="grid g2" style="margin-top:18px">' + nextHtml + targetHtml + "</div>" +
      '<div class="card" style="margin-top:18px"><h3>Today\'s schedule</h3><div class="card-sub">' + SB.fmtDate(SB.now()) + '</div><div class="queue">' + schedule + "</div></div>"
    );
  }

  function weekRange() {
    const d = SB.startOfDay(SB.now());
    const dow = (d.getDay() + 6) % 7; // Monday start
    const start = d.getTime() - dow * SB.DAY;
    return [start, start + 7 * SB.DAY];
  }

  /* ================================================================
     STAFF: SCHEDULE (week grid)
     ================================================================ */
  function staffSchedule(user) {
    const [w0] = weekRange();
    const days = [];
    for (let i = 0; i < 6; i++) { // Mon-Sat
      const dayStart = w0 + i * SB.DAY;
      const appts = SB.state.appts.filter((a) => a.staffId === user.id &&
        a.start >= dayStart && a.start < dayStart + SB.DAY &&
        (a.status === "booked" || a.status === "completed")).sort((a, b) => a.start - b.start);
      days.push({ date: new Date(dayStart), appts });
    }
    const cols = days.map((d) => {
      const isToday = SB.sameDay(d.date, SB.now());
      const locId = SB.staffLocationOn(user, d.date);
      const L = locId ? SB.locationById(locId) : null;
      const items = d.appts.map((a) => {
        const s = SB.serviceById(a.serviceId), c = SB.clientById(a.clientId);
        return '<div style="background:' + SB.CATEGORIES[s.category].color + '18;border-left:3px solid ' + SB.CATEGORIES[s.category].color +
          ';border-radius:8px;padding:8px 10px;margin-bottom:6px">' +
          '<div style="font-weight:600;font-size:12px">' + SB.fmtTime(new Date(a.start)) + "</div>" +
          '<div style="font-size:12px">' + H(s.name) + "</div>" +
          '<div style="font-size:11px;color:var(--ink-soft)">' + H(c ? c.name.split(" ")[0] : "") + "</div></div>";
      }).join("") || '<div class="muted" style="font-size:12px;padding:8px 0">no bookings</div>';
      return (
        '<div style="flex:1;min-width:150px">' +
          '<div style="text-align:center;padding:6px 8px;border-radius:10px;margin-bottom:8px;font-weight:600;font-size:13px;' +
          (isToday ? "background:var(--rose-deep);color:#fff" : "background:var(--cream)") + '">' +
          d.date.toLocaleDateString("en-GB", { weekday: "short" }) + " " + d.date.getDate() +
          (L ? '<div style="font-size:10px;font-weight:600;margin-top:2px;' + (isToday ? "color:rgba(255,255,255,.85)" : "color:" + L.color) + '">📍 ' + H(L.name) + "</div>" : "") + "</div>" +
          items +
        "</div>"
      );
    }).join("");
    const total = sum(days, (d) => d.appts.length);
    const hours = sum(days.flatMap((d) => d.appts), (a) => a.mins) / 60;

    return (
      '<div class="page-head"><h1>My schedule</h1><p>Week of ' + SB.fmtDate(new Date(w0)) + " · " + total + " appointments · " + hours.toFixed(1) + " hours booked</p></div>" +
      '<div class="card"><div style="display:flex;gap:10px;overflow-x:auto">' + cols + "</div></div>"
    );
  }

  /* ================================================================
     STAFF: EARNINGS
     ================================================================ */
  function staffEarnings(user) {
    const isOwner = user.role === "owner";
    const [mo0, mo1] = range(30, 0);
    const monthC = completed(mo0, mo1, user.id);
    const gross = sum(monthC, SB.apptRevenue);
    const pay = isOwner ? sum(monthC, SB.apptProfit) : sum(monthC, SB.apptCommission);
    const product = sum(monthC, SB.apptCost);
    const clinicShare = gross - pay - (isOwner ? product : 0);

    // weekly earnings last 8 weeks
    const weeks = [];
    for (let w = 7; w >= 0; w--) {
      const [f, t] = range((w + 1) * 7, w * 7);
      const c = completed(f, t, user.id);
      const p = isOwner ? sum(c, SB.apptProfit) : sum(c, SB.apptCommission);
      weeks.push({ y: p, label: (8 - w) });
    }
    const weekChart = Charts.columns(weeks.map((w) => ({ label: "W" + w.label, value: w.y, color: user.color })), { height: 200, yfmt: (v) => "£" + Math.round(v) });

    // breakdown by category
    const byCat = catBreakdown(monthC);
    const rows = byCat.map((r) => {
      const share = isOwner ? r.profit : monthC.filter((a) => SB.serviceById(a.serviceId).category === catKey(r.label)).reduce((s, a) => s + SB.apptCommission(a), 0);
      return '<tr><td>' + H(r.label) + '</td><td class="num">' + r.count + '</td><td class="num">' + M(r.rev) + '</td><td class="num"><b>' + M(share) + "</b></td></tr>";
    }).join("");

    const deduction = isOwner
      ? '<div class="callout info"><span>ℹ️</span><div>As the owner you keep the profit: gross revenue minus product costs and your team\'s pay.</div></div>'
      : '<div class="callout"><span>💷</span><div>You earn <b>' + (user.commissionRate * 100) + "%</b> commission on every treatment you perform. Product costs and room are covered by the clinic.</div></div>";

    return (
      '<div class="page-head"><h1>My earnings</h1><p>What you have earned over the last 30 days, and how it breaks down.</p></div>' +
      '<div class="grid g4">' +
        kpiCard("Treatments (30d)", monthC.length, I("droplet"), "var(--rose-soft)", "") +
        kpiCard("Revenue generated", M(gross), I("wallet"), "#ECE8F5", "") +
        kpiCard(isOwner ? "Your profit" : "Your commission", M(pay), I("star"), "#E5F0E4", isOwner ? '<span class="pill pill-green">owner</span>' : '<span class="pill pill-violet">' + (user.commissionRate*100) + "%</span>") +
        kpiCard(isOwner ? "Product costs" : "Avg. per treatment", isOwner ? "-" + M(product) : M(monthC.length ? pay / monthC.length : 0), I("bottle"), "#FBEFD9", "") +
      "</div>" +
      '<div style="margin-top:16px">' + deduction + "</div>" +
      '<div class="grid g2" style="margin-top:18px">' +
        '<div class="card"><h3>' + (isOwner ? "Profit" : "Commission") + ' by week</h3><div class="card-sub">Last 8 weeks</div>' + weekChart + "</div>" +
        '<div class="card"><h3>Earnings by treatment type</h3><div class="card-sub">Last 30 days</div>' +
          '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Category</th><th class="num">Done</th><th class="num">Revenue</th><th class="num">' + (isOwner ? "Profit" : "You earn") + '</th></tr></thead><tbody>' + rows + "</tbody></table></div></div>" +
      "</div>"
    );
  }
  function catKey(label) { return Object.keys(SB.CATEGORIES).find((k) => SB.CATEGORIES[k].label === label); }

  /* ================================================================
     DEMO DOCK
     ================================================================ */
  function dock() {
    const clock = SB.now().toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    const feed = SB.state.activity.slice(0, 12).map((e) =>
      '<div class="feed-item"><div class="feed-ico">' + e.icon + '</div><div class="feed-text">' + H(e.text) + "</div></div>").join("");
    return (
      '<div class="dock">' +
        '<div class="dock-head" onclick="App.toggleDock()">🎬 Demo control <span class="clock">' + clock + " " + (ui.dockOpen ? "▾" : "▸") + "</span></div>" +
        '<div class="dock-body' + (ui.dockOpen ? "" : " collapsed") + '">' +
          '<p>Fast-forward time to watch the waitlist automation work, or reset the demo.</p>' +
          '<div class="dock-btns">' +
            '<button class="dock-btn" onclick="App.advance(24)">⏩ Advance 24h</button>' +
            '<button class="dock-btn" onclick="App.advance(1)">+1h</button>' +
            '<button class="dock-btn warn" onclick="App.resetDemo()">↺ Reset demo</button>' +
          "</div>" +
          '<div style="font-weight:600;margin-top:6px;font-size:12px;color:rgba(255,255,255,.8)">Live activity</div>' +
          '<div class="feed" style="max-height:200px">' + (feed || '<p>No activity yet.</p>') + "</div>" +
        "</div>" +
      "</div>"
    );
  }

  /* ================================================================
     ROUTING + ACTIONS
     ================================================================ */
  function render() {
    let content = "";
    if (ui.view === "site") content = siteView();
    else if (ui.view === "login") content = loginView();
    else if (ui.view === "dash") content = dashView();
    $("app").innerHTML = topbar() + content;
    $("dock").innerHTML = dock();
    renderModal();
  }

  function go(v) { ui.view = v; if (v === "login") ui.login = { staffId: null, pin: "" }; render(); }
  function setCat(c) { ui.siteCat = c; render(); }
  function setTab(t) { const u = SB.currentUser(); if (u && u.role === "owner") ui.ownerTab = t; else ui.staffTab = t; render(); }
  function toggleDock() { ui.dockOpen = !ui.dockOpen; render(); }

  function advance(hrs) {
    const cascades = SB.advance(hrs * SB.HOUR);
    if (cascades) toast("🔁 " + cascades + " unclaimed slot" + (cascades>1?"s":"") + " cascaded to the next clients", "info");
    render();
  }
  function simCancel(id) {
    const res = SB.cancelAppointment(id);
    if (res && res.offered && res.offered.length) toast("📲 Slot freed. Offered to the first " + res.offered.length + " on the waitlist", "info");
    else toast("Slot freed and released as open availability", "info");
    render();
  }
  function simAccept(id) {
    const a = SB.acceptOffer(id);
    if (a) toast("✅ Claimed! " + M(a.price) + " revenue recovered", "good");
    render();
  }
  function resetDemo() {
    if (!confirm("Reset the demo to its starting data?")) return;
    SB.reset(); ui.view = "site"; ui.siteCat = "all"; render();
    toast("Demo reset", "info");
  }

  function boot() {
    SB.load();
    render();
  }

  return {
    boot, go, setCat, setTab, toggleDock,
    openBooking, openWaitlist, selectSlot, setBookingLoc, setBookingStaff, setBookingDay, setWaitLoc, submitBooking, submitWaitlist, closeModal, backdropClose,
    openManage, manageLookup, clientCancel, openClaim, claimAccept, claimDecline,
    pickStaff, pinInput, tryLogin, doLogout,
    advance, simCancel, simAccept, resetDemo,
  };
})();

document.addEventListener("DOMContentLoaded", App.boot);
