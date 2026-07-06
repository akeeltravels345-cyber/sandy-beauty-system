/* ============================================================
   Sandy Beauty & Academy - Operating System
   data.js  -  configuration, seed data, state, waitlist engine
   ============================================================ */

const SB = (function () {
  "use strict";

  /* ---------- deterministic RNG so the demo is stable ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  let rng = mulberry32(20260705);
  const rand = () => rng();
  const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const chance = (p) => rand() < p;

  /* ---------- brand ---------- */
  const BRAND = {
    name: "Sandy Beauty & Academy",
    short: "Sandy Beauty",
    tagline: "Surbiton's premier clinic for aesthetics, SPMU, laser and skin",
    address: "67e Victoria Road, Surbiton, Surrey KT6 4NR",
    phone: "020 3989 5877",
    email: "info@sandybeauty.co.uk",
    instagram: "@sandybeauty_aesthetics",
  };

  /* ---------- services (real prices from her site + typical clinic menu) ----------
     cost   = consumables / product cost per treatment
     commissionRate = share paid to the practitioner who performs it        */
  const SERVICES = [
    // category, name, price, mins, cost, commission
    svc("balancing", "8ml Full Face Profile Balancing", 1000, 90, 300, 0.35),
    svc("balancing", "6ml Profile Balancing", 870, 90, 240, 0.35),
    svc("balancing", "5ml Profile Balancing", 770, 90, 200, 0.35),
    svc("balancing", "4ml Profile Balancing", 670, 90, 170, 0.35),
    svc("balancing", "3ml Profile Balancing", 570, 60, 140, 0.35),
    svc("filler", "Lip Filler 1ml", 180, 45, 55, 0.4),
    svc("filler", "Cheek Filler 1ml", 250, 45, 70, 0.4),
    svc("filler", "Nose Filler", 220, 45, 65, 0.4),
    svc("filler", "Lip & Anti-Wrinkle Combo", 360, 60, 95, 0.4),
    svc("botox", "Anti-Wrinkle 1 Area", 150, 30, 30, 0.4),
    svc("botox", "Anti-Wrinkle 3 Areas", 250, 30, 55, 0.4),
    svc("skin", "Profhilo Skin Booster", 250, 45, 90, 0.4),
    svc("skin", "Polynucleotides", 200, 45, 80, 0.4),
    svc("skin", "Hydrafacial", 90, 60, 20, 0.45),
    svc("skin", "Dermaplaning Facial", 55, 45, 8, 0.45),
    svc("spmu", "Microblading Brows", 250, 150, 35, 0.45),
    svc("spmu", "Lip Blush SPMU", 280, 150, 40, 0.45),
    svc("lashes", "Classic Lash Set", 45, 90, 10, 0.5),
    svc("lashes", "Hybrid Lash Set", 60, 105, 12, 0.5),
    svc("laser", "Laser Hair Removal - Small", 40, 30, 4, 0.35),
    svc("laser", "Laser Hair Removal - Large", 95, 45, 8, 0.35),
    svc("laser", "Laser Tattoo Removal", 80, 30, 6, 0.35),
    svc("laser", "IPL Photofacial", 90, 45, 12, 0.4),
    svc("wax", "Full Leg Wax", 30, 30, 5, 0.5),
    svc("wax", "Hollywood Wax", 35, 30, 5, 0.5),
    svc("massage", "Aromatherapy Massage", 55, 60, 6, 0.5),
  ];
  function svc(category, name, price, mins, cost, commissionRate) {
    return { id: slug(name), category, name, price, mins, cost, commissionRate };
  }

  const CATEGORIES = {
    balancing: { label: "Facial Balancing", color: "#8E4B63" },
    filler: { label: "Dermal Filler", color: "#B76E79" },
    botox: { label: "Anti-Wrinkle", color: "#C58BA0" },
    skin: { label: "Skin & Boosters", color: "#6FA8A0" },
    spmu: { label: "SPMU / Brows", color: "#C9A227" },
    lashes: { label: "Lashes", color: "#D89AA6" },
    laser: { label: "Laser & IPL", color: "#7C6BA8" },
    wax: { label: "Waxing", color: "#A0885B" },
    massage: { label: "Massage", color: "#7FA05B" },
  };

  /* ---------- locations ----------
     Her two real clinics: the Kingston upon Thames flagship (Surbiton, KT6) and
     the Shoreditch clinic in East London. */
  const LOCATIONS = [
    { id: "kingston", name: "Kingston upon Thames", venue: "Kingston upon Thames Clinic", address: "67e Victoria Road, Surbiton KT6 4NR", color: "#8E4B63" },
    { id: "shoreditch", name: "Shoreditch", venue: "Shoreditch Clinic", address: "2-4 Great Eastern Street, London EC2A 3NW", color: "#6FA8A0" },
  ];

  /* ---------- team ----------
     rota maps weekday (1=Mon .. 6=Sat) to the location the practitioner works
     that day. Sundays are closed. This is what makes location availability differ. */
  const STAFF = [
    { id: "sandy", name: "Sandy Kaur", role: "owner", title: "Founder & Lead Aesthetician",
      pin: "1234", commissionRate: 1.0, monthlyTarget: 22000, skills: ["balancing","filler","botox","skin","spmu"], color: "#8E4B63",
      rota: { 1: "kingston", 2: "kingston", 3: "shoreditch", 4: "shoreditch", 5: "kingston", 6: "kingston" } },
    { id: "amira", name: "Amira Hassan", role: "aesthetician", title: "Aesthetic Practitioner",
      pin: "1111", commissionRate: 0.4, monthlyTarget: 3000, skills: ["filler","botox","skin","laser"], color: "#B76E79",
      rota: { 1: "kingston", 2: "shoreditch", 3: "shoreditch", 4: "kingston", 5: "shoreditch", 6: "kingston" } },
    { id: "priya", name: "Priya Shah", role: "aesthetician", title: "SPMU & Lash Artist",
      pin: "2222", commissionRate: 0.45, monthlyTarget: 2600, skills: ["spmu","lashes","skin","wax"], color: "#C9A227",
      rota: { 1: "shoreditch", 2: "shoreditch", 3: "kingston", 4: "kingston", 5: "shoreditch", 6: "shoreditch" } },
    { id: "lena", name: "Lena Novak", role: "aesthetician", title: "Laser & Skin Therapist",
      pin: "3333", commissionRate: 0.4, monthlyTarget: 2200, skills: ["laser","skin","wax","massage"], color: "#7C6BA8",
      rota: { 1: "shoreditch", 2: "kingston", 3: "shoreditch", 4: "shoreditch", 5: "kingston", 6: "shoreditch" } },
  ];

  const FIRST = ["Olivia","Amelia","Isla","Ava","Mia","Grace","Sophia","Ella","Freya","Lily","Ruby","Emily",
    "Chloe","Poppy","Aisha","Zara","Layla","Maya","Nadia","Sofia","Hannah","Jessica","Priya","Sara","Leah",
    "Charlotte","Rose","Anya","Bella","Nina","Yasmin","Farah","Dua","Hafsa","Beatrice","Elena","Simran"];
  const LAST = ["Smith","Patel","Khan","Jones","Ahmed","Taylor","Brown","Williams","Wilson","Evans","Kaur",
    "Begum","Roberts","Walker","Hughes","Green","Clarke","Hall","Ward","Cooper","Reed","Ali","Shah","Iqbal",
    "Turner","Bailey","Foster","Cole","Fisher","Chapman","Doyle","Rahman","Malik","Dixon"];

  /* ---------- date helpers ---------- */
  const DAY = 86400000, HOUR = 3600000;
  const TODAY = new Date(2026, 6, 5, 9, 0, 0); // demo "now" anchor: 5 Jul 2026 09:00
  function fmtDate(d) { return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
  function fmtDay(d) { return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }); }
  function fmtTime(d) { return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); }
  function money(n) { return "£" + Math.round(n).toLocaleString("en-GB"); }
  function money2(n) { return "£" + n.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
  function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
  function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
  function sameDay(a, b) { return startOfDay(a).getTime() === startOfDay(b).getTime(); }
  function addDays(d, n) { return new Date(d.getTime() + n * DAY); }

  /* ---------- state ---------- */
  let state = null;
  const LS_KEY = "sandybeauty_v1";

  function newClient(id) {
    const first = pick(FIRST), last = pick(LAST);
    return {
      id: "c" + id,
      name: first + " " + last,
      email: (first + "." + last).toLowerCase() + "@email.com",
      phone: "07" + randInt(100,999) + " " + randInt(100000,999999),
      since: null,
      visits: 0,
      spend: 0,
    };
  }

  function generate() {
    rng = mulberry32(20260705);
    const clients = [];
    for (let i = 1; i <= 140; i++) clients.push(newClient(i));

    const appts = [];
    let aid = 1;

    // popularity weighting - some treatments are booked far more often
    const weighted = [];
    SERVICES.forEach((s) => {
      let w = 3;
      if (s.category === "botox") w = 12;
      else if (s.category === "filler") w = 11;
      else if (s.category === "lashes") w = 9;
      else if (s.category === "skin") w = 8;
      else if (s.category === "laser") w = 8;
      else if (s.category === "spmu") w = 5;
      else if (s.category === "wax") w = 6;
      else if (s.category === "balancing") w = 2;
      for (let k = 0; k < w; k++) weighted.push(s);
    });

    function staffFor(service) {
      const able = STAFF.filter((st) => st.skills.includes(service.category));
      return able.length ? pick(able) : STAFF[0];
    }

    // build 90 days of history + 21 days ahead
    for (let dOff = -90; dOff <= 21; dOff++) {
      const base = startOfDay(addDays(TODAY, dOff));
      const dow = base.getDay();
      if (dow === 0) continue; // closed Sundays
      let slots = dow === 6 ? randInt(9, 13) : randInt(6, 11); // busier Saturdays
      const used = {}; // staff time collision guard (rough)
      for (let s = 0; s < slots; s++) {
        const service = pick(weighted);
        const staff = staffFor(service);
        const hour = randInt(9, 17);
        const min = pick([0, 15, 30, 45]);
        const when = new Date(base); when.setHours(hour, min, 0, 0);
        const key = staff.id + "-" + hour;
        if (used[key]) continue; used[key] = true;

        const client = pick(clients);
        let status = "completed";
        if (dOff >= 0) status = "booked";
        if (dOff < 0) {
          if (chance(0.06)) status = "cancelled";
          else if (chance(0.04)) status = "no-show";
        }
        const appt = {
          id: "a" + (aid++),
          clientId: client.id,
          serviceId: service.id,
          staffId: staff.id,
          locationId: staff.rota[when.getDay()] || "kingston",
          start: when.getTime(),
          mins: service.mins,
          price: service.price,
          status,
          fromWaitlist: false,
          createdAt: addDays(when, -randInt(2, 20)).getTime(),
        };
        appts.push(appt);
        if (status === "completed") {
          client.visits++; client.spend += service.price;
          if (!client.since) client.since = when.getTime();
        }
      }
    }

    // some historic cancellations were rescued by the (proposed) waitlist -> ROI story
    appts.filter((a) => a.status === "cancelled" && a.start < TODAY.getTime()).forEach((a) => {
      if (chance(0.55)) {
        // a rescue appointment exists in same slot
        const rescueClient = pick(clients);
        appts.push({
          id: "a" + (aid++), clientId: rescueClient.id, serviceId: a.serviceId,
          staffId: a.staffId, locationId: a.locationId, start: a.start, mins: a.mins, price: a.price,
          status: "completed", fromWaitlist: true, createdAt: a.start - HOUR * 20,
        });
        rescueClient.visits++; rescueClient.spend += a.price;
      }
    });

    // set client "since" for anyone missed
    clients.forEach((c) => { if (!c.since) c.since = addDays(TODAY, -randInt(30, 400)).getTime(); });

    // live waitlist for the demo. Concentrated in the most in-demand categories
    // so a cancellation reliably cascades through multiple batches of 3.
    const waitlist = [];
    const wlPlan = [["botox", 6], ["filler", 6], ["spmu", 3], ["balancing", 3]];
    const wlNotes = ["Flexible on time", "Prefers weekends", "Any weekday PM", "ASAP please",
      "Mornings best", "Happy to travel in", "After 5pm ideally", "Very flexible"];
    let wi = 0;
    wlPlan.forEach(function (row) {
      const opts = SERVICES.filter((s) => s.category === row[0]);
      for (let k = 0; k < row[1]; k++) {
        const service = pick(opts);
        const client = pick(clients);
        waitlist.push({
          id: "w" + (++wi),
          clientId: client.id,
          serviceId: service.id,
          locationId: chance(0.55) ? "any" : pick(LOCATIONS).id,
          note: pick(wlNotes),
          createdAt: addDays(TODAY, -randInt(1, 25)).getTime(),
          status: "waiting", // waiting | offered | booked | passed
          offeredAt: null,
          offerExpires: null,
        });
      }
    });
    waitlist.sort((a, b) => a.createdAt - b.createdAt);

    return {
      now: TODAY.getTime(),
      clients, appts, waitlist,
      activity: [{ t: TODAY.getTime(), icon: "🎉", text: "System initialised with live clinic data." }],
      session: null, // {staffId}
      seq: aid,
      wseq: waitlist.length + 1,
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) { state = JSON.parse(raw); return; }
    } catch (e) {}
    state = generate();
    save();
  }
  function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {} }
  function reset() { state = generate(); save(); }

  /* ---------- lookups ---------- */
  const serviceById = (id) => SERVICES.find((s) => s.id === id);
  const staffById = (id) => STAFF.find((s) => s.id === id);
  const locationById = (id) => LOCATIONS.find((l) => l.id === id);
  const clientById = (id) => state.clients.find((c) => c.id === id);
  function staffLocationOn(staff, date) { return staff.rota[date.getDay()] || null; }
  function now() { return new Date(state.now); }

  function log(icon, text) {
    state.activity.unshift({ t: state.now, icon, text });
    if (state.activity.length > 60) state.activity.pop();
  }

  /* ---------- booking ---------- */
  function book({ clientName, email, phone, serviceId, staffId, locationId, startMs, fromWaitlistId }) {
    const service = serviceById(serviceId);
    let client = state.clients.find((c) => c.email === email || c.name === clientName);
    if (!client) {
      client = newClient(state.clients.length + 1);
      client.name = clientName; client.email = email; client.phone = phone || client.phone;
      client.since = state.now;
      state.clients.push(client);
    }
    const appt = {
      id: "a" + (state.seq++), clientId: client.id, serviceId, staffId,
      locationId: locationId || "kingston",
      start: startMs, mins: service.mins, price: service.price,
      status: "booked", fromWaitlist: !!fromWaitlistId, createdAt: state.now,
    };
    state.appts.push(appt);
    const loc = locationById(appt.locationId);
    log("📅", client.name + " booked " + service.name + " at " + (loc ? loc.name : "the clinic") + " (" + fmtDay(new Date(startMs)) + ")");
    save();
    return appt;
  }

  function joinWaitlist({ clientName, email, phone, serviceId, locationId, note }) {
    let client = state.clients.find((c) => c.email === email || c.name === clientName);
    if (!client) {
      client = newClient(state.clients.length + 1);
      client.name = clientName; client.email = email; client.phone = phone || client.phone;
      client.since = state.now;
      state.clients.push(client);
    }
    const entry = {
      id: "w" + (state.wseq++), clientId: client.id, serviceId,
      locationId: locationId || "any",
      note: note || "", createdAt: state.now, status: "waiting",
      offeredAt: null, offerExpires: null,
    };
    state.waitlist.push(entry);
    log("⭐", client.name + " joined the waitlist for " + serviceById(serviceId).name);
    save();
    return entry;
  }

  /* ============================================================
     WAITLIST CASCADE ENGINE
     On cancellation: offer the freed slot to the first 3 matching
     waitlist clients. They have 24h to claim. If unclaimed, the
     offer expires and cascades to the next 3, and so on.
     ============================================================ */
  function cancelAppointment(apptId, by) {
    const appt = state.appts.find((a) => a.id === apptId);
    if (!appt || appt.status !== "booked") return null;
    appt.status = "cancelled";
    const client = clientById(appt.clientId);
    log("❌", (client ? client.name : "A client") + " cancelled " + serviceById(appt.serviceId).name +
      " on " + fmtDay(new Date(appt.start)) + ". Freed slot released to waitlist.");
    const opened = openSlot(appt);
    save();
    return opened;
  }

  // create an "open slot" and immediately offer to first 3
  function openSlot(appt) {
    const slot = {
      serviceId: appt.serviceId, staffId: appt.staffId, start: appt.start, mins: appt.mins, price: appt.price,
    };
    return offerNextBatch(slot);
  }

  function matchingWaiters(slot) {
    // match on same service first, then same category, oldest first.
    // a waiter matches on location if they chose "any" or the slot's location.
    const okLoc = (w) => !slot.locationId || w.locationId === "any" || !w.locationId || w.locationId === slot.locationId;
    const svcMatch = state.waitlist.filter((w) => w.status === "waiting" && w.serviceId === slot.serviceId && okLoc(w));
    const catMatch = state.waitlist.filter((w) => w.status === "waiting" && okLoc(w) &&
      serviceById(w.serviceId).category === serviceById(slot.serviceId).category && w.serviceId !== slot.serviceId);
    return svcMatch.concat(catMatch).sort((a, b) => a.createdAt - b.createdAt);
  }

  function offerNextBatch(slot) {
    const queue = matchingWaiters(slot);
    if (!queue.length) {
      log("ℹ️", "Slot freed but no matching waitlist clients yet. Held as open availability.");
      return { offered: [], slot };
    }
    const batch = queue.slice(0, 3);
    batch.forEach((w) => {
      w.status = "offered";
      w.offeredAt = state.now;
      w.offerExpires = state.now + 24 * HOUR;
      w.slot = slot;
      const c = clientById(w.clientId);
      log("📲", "Offer sent to " + (c ? c.name : "client") + " - " + serviceById(slot.serviceId).name +
        " on " + fmtDay(new Date(slot.start)) + ". Expires in 24h.");
    });
    save();
    return { offered: batch, slot };
  }

  // a waitlist client accepts their offer -> becomes a booking
  function acceptOffer(waitId) {
    const w = state.waitlist.find((x) => x.id === waitId);
    if (!w || w.status !== "offered") return null;
    w.status = "booked";
    const c = clientById(w.clientId);
    const appt = {
      id: "a" + (state.seq++), clientId: w.clientId, serviceId: w.slot.serviceId,
      staffId: w.slot.staffId, start: w.slot.start, mins: w.slot.mins, price: w.slot.price,
      status: "booked", fromWaitlist: true, createdAt: state.now,
    };
    state.appts.push(appt);
    // expire the other current offers on the same slot
    state.waitlist.forEach((o) => {
      if (o.status === "offered" && o.slot && o.slot.start === w.slot.start && o.slot.staffId === w.slot.staffId && o.id !== w.id) {
        o.status = "waiting"; o.offeredAt = null; o.offerExpires = null; o.slot = null;
      }
    });
    log("✅", (c ? c.name : "Client") + " claimed the freed slot. " + money(w.slot.price) + " revenue recovered.");
    save();
    return appt;
  }

  // a waitlist client declines their offer before the 24h is up
  function declineOffer(waitId) {
    const w = state.waitlist.find((x) => x.id === waitId);
    if (!w || w.status !== "offered") return null;
    const slot = w.slot;
    w.status = "passed"; w.offeredAt = null; w.offerExpires = null; w.slot = null;
    const c = clientById(w.clientId);
    log("🙅", (c ? c.name : "Client") + " declined the offer. Passing down the queue.");
    // if that was the last live offer on this slot, cascade to the next batch now
    const stillLive = state.waitlist.some((o) => o.status === "offered" && o.slot &&
      o.slot.start === slot.start && o.slot.staffId === slot.staffId);
    let res = null;
    if (!stillLive) res = offerNextBatch(slot);
    save();
    return res;
  }

  /* time engine: advance the demo clock. Expired offers cascade to next 3. */
  function advance(ms) {
    state.now += ms;
    let cascades = 0;
    // group expired offers by slot
    const expiredSlots = {};
    state.waitlist.forEach((w) => {
      if (w.status === "offered" && w.offerExpires && state.now >= w.offerExpires) {
        w.status = "expired-round";
        const key = w.slot.staffId + "@" + w.slot.start;
        expiredSlots[key] = w.slot;
        const c = clientById(w.clientId);
        log("⏳", "Offer to " + (c ? c.name : "client") + " expired unclaimed (24h passed).");
      }
    });
    // for each slot whose batch expired, cascade to next 3
    Object.values(expiredSlots).forEach((slot) => {
      // mark previous round holders as passed so they are excluded
      const res = offerNextBatch(slot);
      if (res.offered.length) {
        cascades++;
        log("🔁", "No response in 24h - cascading " + serviceById(slot.serviceId).name +
          " slot to the next clients in the queue.");
      } else {
        log("📭", "Waitlist exhausted for this slot - now shown as open availability on the booking page.");
      }
    });
    // convert the "expired-round" to a terminal state so they don't get re-offered
    state.waitlist.forEach((w) => { if (w.status === "expired-round") w.status = "passed"; });
    save();
    return cascades;
  }

  /* ---------- auth ---------- */
  function login(staffId, pin) {
    const s = staffById(staffId);
    if (s && s.pin === pin) { state.session = { staffId }; save(); return s; }
    return null;
  }
  function logout() { state.session = null; save(); }
  function currentUser() { return state.session ? staffById(state.session.staffId) : null; }

  /* ---------- analytics ---------- */
  function completedInRange(from, to, staffId) {
    return state.appts.filter((a) =>
      a.status === "completed" && a.start >= from && a.start < to &&
      (!staffId || a.staffId === staffId));
  }
  function bookedInRange(from, to, staffId) {
    return state.appts.filter((a) =>
      (a.status === "completed" || a.status === "booked") && a.start >= from && a.start < to &&
      (!staffId || a.staffId === staffId));
  }

  function apptRevenue(a) { return a.price; }
  function apptCost(a) { return serviceById(a.serviceId).cost; }
  function apptCommission(a) {
    const st = staffById(a.staffId);
    const svcObj = serviceById(a.serviceId);
    if (st.role === "owner") return 0; // owner takes profit, not commission
    return a.price * svcObj.commissionRate;
  }
  function apptProfit(a) { return a.price - apptCost(a) - apptCommission(a); }

  return {
    BRAND, SERVICES, CATEGORIES, STAFF, LOCATIONS,
    DAY, HOUR,
    fmtDate, fmtDay, fmtTime, money, money2, slug, startOfDay, sameDay, addDays,
    load, save, reset,
    get state() { return state; },
    serviceById, staffById, locationById, clientById, staffLocationOn, now, log,
    book, joinWaitlist, cancelAppointment, offerNextBatch, acceptOffer, declineOffer, advance,
    login, logout, currentUser,
    completedInRange, bookedInRange, apptRevenue, apptCost, apptCommission, apptProfit,
    matchingWaiters,
  };
})();
