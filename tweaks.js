/* ============================================================
   tweaks.js  ·  Appearance panel
   Three expressive controls that reshape the whole feel by
   rewriting core theme tokens on :root. Persists to localStorage.
   Self-contained: lives outside #app so app re-renders never wipe it.
   ============================================================ */
(function () {
  "use strict";

  const KEY = "sb_tweaks_v1";
  const DEFAULTS = { palette: "blush", soft: "soft", font: "editorial" };

  /* ---- palettes: each reshapes the primary identity + neutrals + glow ---- */
  const PALETTES = {
    blush: {
      name: "Blush", swatch: ["#C97E90", "#8C4A61"],
      v: { "--rose": "#BE7183", "--rose-deep": "#8C4A61", "--rose-soft": "#F8E9ED", "--blush": "#E6A6B7",
        "--cream": "#FBF6F4", "--cream-2": "#F6EDEA", "--line": "#F1E6E3", "--line-2": "#EAD9D5",
        "--grad-rose": "linear-gradient(135deg, #C97E90 0%, #8C4A61 100%)",
        "--glow-a": "rgba(230,166,183,0.20)", "--glow-b": "rgba(124,107,168,0.07)" },
    },
    plum: {
      name: "Plum", swatch: ["#B278AE", "#6C3B66"],
      v: { "--rose": "#A96A93", "--rose-deep": "#6C3B66", "--rose-soft": "#F2E8F1", "--blush": "#D7A9D0",
        "--cream": "#FAF6F9", "--cream-2": "#F3EAF2", "--line": "#EEE2ED", "--line-2": "#E4D3E2",
        "--grad-rose": "linear-gradient(135deg, #B278AE 0%, #6C3B66 100%)",
        "--glow-a": "rgba(178,120,174,0.20)", "--glow-b": "rgba(111,168,160,0.07)" },
    },
    peach: {
      name: "Peach", swatch: ["#E39B77", "#B0553A"],
      v: { "--rose": "#D2825F", "--rose-deep": "#AE5236", "--rose-soft": "#FBEBE2", "--blush": "#F2B79C",
        "--cream": "#FDF7F3", "--cream-2": "#FAEEE7", "--line": "#F6E5DB", "--line-2": "#EFD6C8",
        "--grad-rose": "linear-gradient(135deg, #E39B77 0%, #B0553A 100%)",
        "--glow-a": "rgba(233,155,119,0.20)", "--glow-b": "rgba(201,162,39,0.08)" },
    },
    champagne: {
      name: "Champagne", swatch: ["#CBA06B", "#96683B"],
      v: { "--rose": "#C0955F", "--rose-deep": "#8F6236", "--rose-soft": "#F6ECDC", "--blush": "#E3C79A",
        "--cream": "#FCF8F1", "--cream-2": "#F7EFE1", "--line": "#F1E7D5", "--line-2": "#E8D9BF",
        "--grad-rose": "linear-gradient(135deg, #CBA06B 0%, #96683B 100%)",
        "--glow-a": "rgba(203,160,107,0.20)", "--glow-b": "rgba(124,107,168,0.06)" },
    },
  };

  /* ---- softness: radius + shadow depth together ---- */
  const SOFT = {
    crisp: {
      name: "Crisp",
      v: { "--radius": "10px", "--radius-sm": "8px",
        "--shadow": "0 10px 26px -16px rgba(120,62,82,0.26), 0 2px 6px -4px rgba(120,62,82,0.12)",
        "--shadow-sm": "0 3px 11px -7px rgba(120,62,82,0.20), 0 1px 2px rgba(120,62,82,0.05)",
        "--shadow-xs": "0 1px 4px -2px rgba(120,62,82,0.14)" },
    },
    soft: {
      name: "Soft",
      v: { "--radius": "20px", "--radius-sm": "13px",
        "--shadow": "0 18px 48px -18px rgba(120,62,82,0.30), 0 4px 14px -6px rgba(120,62,82,0.14)",
        "--shadow-sm": "0 6px 20px -10px rgba(120,62,82,0.22), 0 1px 3px rgba(120,62,82,0.06)",
        "--shadow-xs": "0 2px 8px -4px rgba(120,62,82,0.16)" },
    },
    pillowy: {
      name: "Pillowy",
      v: { "--radius": "30px", "--radius-sm": "20px",
        "--shadow": "0 30px 66px -22px rgba(120,62,82,0.36), 0 8px 22px -10px rgba(120,62,82,0.18)",
        "--shadow-sm": "0 14px 34px -16px rgba(120,62,82,0.28), 0 2px 6px rgba(120,62,82,0.07)",
        "--shadow-xs": "0 4px 14px -7px rgba(120,62,82,0.20)" },
    },
  };

  /* ---- headline typeface ---- */
  const FONTS = {
    editorial: { name: "Editorial", v: { "--serif": '"Cormorant Garamond", Georgia, serif' } },
    dramatic:  { name: "Dramatic",  v: { "--serif": '"DM Serif Display", Georgia, serif' } },
    classic:   { name: "Classic",   v: { "--serif": '"Playfair Display", Georgia, serif' } },
  };

  function load() {
    try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(KEY) || "{}")); }
    catch (e) { return Object.assign({}, DEFAULTS); }
  }
  function save(t) { try { localStorage.setItem(KEY, JSON.stringify(t)); } catch (e) {} }

  let tweaks = load();

  function apply(t) {
    const root = document.documentElement;
    const sets = Object.assign({}, (PALETTES[t.palette] || PALETTES.blush).v,
      (SOFT[t.soft] || SOFT.soft).v, (FONTS[t.font] || FONTS.editorial).v);
    Object.keys(sets).forEach((k) => root.style.setProperty(k, sets[k]));
  }

  // apply saved look immediately (before paint settles) to avoid a flash
  apply(tweaks);

  /* ---------------- panel UI ---------------- */
  function seg(field, opts) {
    return '<div class="sbtw-seg">' + opts.map((o) =>
      '<button class="' + (tweaks[field] === o.id ? "on" : "") + '" data-field="' + field + '" data-val="' + o.id + '">' + o.label + "</button>").join("") + "</div>";
  }

  function swatches() {
    return '<div class="sbtw-sw">' + Object.keys(PALETTES).map((id) => {
      const p = PALETTES[id];
      return '<button class="sbtw-swbtn ' + (tweaks.palette === id ? "on" : "") + '" data-field="palette" data-val="' + id + '" title="' + p.name + '">' +
        '<span class="sbtw-swdot" style="background:linear-gradient(135deg,' + p.swatch[0] + ',' + p.swatch[1] + ')"></span>' +
        '<span class="sbtw-swname">' + p.name + "</span></button>";
    }).join("") + "</div>";
  }

  function panelHTML() {
    return (
      '<button id="sbtw-fab" title="Appearance">' +
        '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2.4"/><circle cx="8" cy="17" r="2.4"/></svg>' +
      "</button>" +
      '<div id="sbtw-panel" class="hidden">' +
        '<div class="sbtw-head"><div><div class="sbtw-title">Appearance</div><div class="sbtw-sub">Reshape the whole feel</div></div>' +
          '<button id="sbtw-close" aria-label="Close">×</button></div>' +
        '<div class="sbtw-body">' +
          '<div class="sbtw-label">Palette</div>' + swatches() +
          '<div class="sbtw-label">Softness</div>' +
            seg("soft", [{ id: "crisp", label: "Crisp" }, { id: "soft", label: "Soft" }, { id: "pillowy", label: "Pillowy" }]) +
          '<div class="sbtw-label">Headline</div>' +
            seg("font", [{ id: "editorial", label: "Editorial" }, { id: "dramatic", label: "Dramatic" }, { id: "classic", label: "Classic" }]) +
        "</div>" +
        '<div class="sbtw-foot"><button id="sbtw-reset">Reset to default</button></div>' +
      "</div>"
    );
  }

  const CSS = `
  #sbtw-root { position: fixed; left: 20px; bottom: 20px; z-index: 90; font-family: var(--sans); }
  #sbtw-fab { width: 52px; height: 52px; border-radius: 50%; background: var(--grad-rose); color: #fff;
    display: grid; place-items: center; box-shadow: 0 14px 30px -10px rgba(140,74,97,0.6); cursor: pointer;
    transition: transform .18s ease, box-shadow .18s ease; }
  #sbtw-fab:hover { transform: translateY(-2px) rotate(-8deg); box-shadow: 0 20px 38px -12px rgba(140,74,97,0.7); }
  #sbtw-fab svg { display: block; }
  #sbtw-panel { position: absolute; left: 0; bottom: 64px; width: 288px; background: var(--paper);
    border: 1px solid var(--line); border-radius: 20px; box-shadow: var(--shadow);
    overflow: hidden; animation: sbtwrise .24s cubic-bezier(.2,.7,.3,1); }
  #sbtw-panel.hidden { display: none; }
  @keyframes sbtwrise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  .sbtw-head { display: flex; align-items: flex-start; justify-content: space-between; padding: 18px 18px 12px; border-bottom: 1px solid var(--line); }
  .sbtw-title { font-family: var(--serif); font-size: 21px; font-weight: 700; color: var(--ink); line-height: 1; }
  .sbtw-sub { font-size: 12px; color: var(--ink-soft); margin-top: 4px; }
  #sbtw-close { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; color: var(--ink-soft); font-size: 20px; transition: all .15s; cursor: pointer; }
  #sbtw-close:hover { background: var(--rose-soft); color: var(--rose-deep); }
  .sbtw-body { padding: 16px 18px 6px; }
  .sbtw-label { font-size: 10.5px; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-soft); font-weight: 700; margin: 4px 0 9px; }
  .sbtw-label:not(:first-child) { margin-top: 18px; }
  .sbtw-sw { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .sbtw-swbtn { display: flex; align-items: center; gap: 9px; padding: 8px 10px; border: 1px solid var(--line-2); border-radius: 12px; background: var(--paper); cursor: pointer; transition: all .15s; }
  .sbtw-swbtn:hover { border-color: var(--rose); }
  .sbtw-swbtn.on { border-color: var(--rose-deep); background: var(--rose-soft); box-shadow: 0 0 0 3px var(--rose-soft); }
  .sbtw-swdot { width: 22px; height: 22px; border-radius: 8px; flex-shrink: 0; box-shadow: inset 0 0 0 1px rgba(0,0,0,.06); }
  .sbtw-swname { font-size: 13px; font-weight: 700; color: var(--ink); }
  .sbtw-seg { display: flex; gap: 4px; background: var(--cream-2); padding: 4px; border-radius: 12px; }
  .sbtw-seg button { flex: 1; padding: 8px 6px; border-radius: 9px; font-size: 12.5px; font-weight: 700; color: var(--ink-soft); cursor: pointer; transition: all .16s; }
  .sbtw-seg button:hover:not(.on) { color: var(--ink); }
  .sbtw-seg button.on { background: var(--paper); color: var(--rose-deep); box-shadow: var(--shadow-xs); }
  .sbtw-foot { padding: 12px 18px 16px; }
  #sbtw-reset { width: 100%; padding: 10px; border-radius: 11px; border: 1px solid var(--line-2); background: var(--paper); font-size: 13px; font-weight: 700; color: var(--ink-soft); cursor: pointer; transition: all .15s; }
  #sbtw-reset:hover { border-color: var(--rose); color: var(--rose-deep); background: var(--rose-soft); }
  @media (max-width: 760px) { #sbtw-root { bottom: auto; top: 68px; } #sbtw-panel { bottom: auto; top: 64px; } }
  `;

  function mount() {
    if (document.getElementById("sbtw-root")) return;
    const style = document.createElement("style");
    style.id = "sbtw-style";
    style.textContent = CSS;
    document.head.appendChild(style);

    const root = document.createElement("div");
    root.id = "sbtw-root";
    root.innerHTML = panelHTML();
    document.body.appendChild(root);

    const panel = document.getElementById("sbtw-panel");
    document.getElementById("sbtw-fab").addEventListener("click", () => panel.classList.toggle("hidden"));
    document.getElementById("sbtw-close").addEventListener("click", () => panel.classList.add("hidden"));
    document.getElementById("sbtw-reset").addEventListener("click", () => {
      tweaks = Object.assign({}, DEFAULTS); save(tweaks); apply(tweaks); refresh();
    });
    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-field]");
      if (!b) return;
      tweaks[b.getAttribute("data-field")] = b.getAttribute("data-val");
      save(tweaks); apply(tweaks); refresh();
    });
    // close when clicking outside
    document.addEventListener("click", (e) => {
      if (!root.contains(e.target) && !panel.classList.contains("hidden")) panel.classList.add("hidden");
    });
  }

  function refresh() {
    const panel = document.getElementById("sbtw-panel");
    const wasOpen = panel && !panel.classList.contains("hidden");
    document.querySelectorAll("#sbtw-root [data-field]").forEach((b) => {
      b.classList.toggle("on", tweaks[b.getAttribute("data-field")] === b.getAttribute("data-val"));
    });
    if (panel && wasOpen) panel.classList.remove("hidden");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
