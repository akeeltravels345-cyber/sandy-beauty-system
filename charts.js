/* ============================================================
   charts.js  -  tiny dependency-free SVG chart helpers
   ============================================================ */

const Charts = (function () {
  "use strict";

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  /* horizontal bar / leaderboard rows */
  function bars(rows, opts) {
    opts = opts || {};
    const max = Math.max(1, ...rows.map((r) => r.value));
    const fmt = opts.format || ((v) => v);
    return '<div class="c-bars">' + rows.map((r) => {
      const pct = (r.value / max) * 100;
      const color = r.color || "var(--rose)";
      return (
        '<div class="c-bar-row">' +
          '<div class="c-bar-label" title="' + esc(r.label) + '">' + esc(r.label) + "</div>" +
          '<div class="c-bar-track"><div class="c-bar-fill" style="width:' + pct.toFixed(1) + "%;background:" + color + '"></div></div>' +
          '<div class="c-bar-value">' + fmt(r.value) + "</div>" +
        "</div>"
      );
    }).join("") + "</div>";
  }

  /* donut with legend */
  function donut(segments, opts) {
    opts = opts || {};
    const size = opts.size || 180, sw = opts.stroke || 26;
    const r = (size - sw) / 2, cx = size / 2, cy = size / 2, C = 2 * Math.PI * r;
    const total = segments.reduce((s, x) => s + x.value, 0) || 1;
    let off = 0;
    const arcs = segments.map((s) => {
      const frac = s.value / total;
      const dash = frac * C;
      const el = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + s.color +
        '" stroke-width="' + sw + '" stroke-dasharray="' + dash.toFixed(2) + " " + (C - dash).toFixed(2) +
        '" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 ' + cx + " " + cy + ')"><title>' +
        esc(s.label) + "</title></circle>";
      off += dash;
      return el;
    }).join("");
    const center = opts.center
      ? '<text x="' + cx + '" y="' + (cy - 4) + '" text-anchor="middle" class="c-donut-num">' + esc(opts.center) + "</text>" +
        '<text x="' + cx + '" y="' + (cy + 16) + '" text-anchor="middle" class="c-donut-sub">' + esc(opts.centerSub || "") + "</text>"
      : "";
    const svg = '<svg viewBox="0 0 ' + size + " " + size + '" width="' + size + '" height="' + size + '" class="c-donut-svg">' + arcs + center + "</svg>";
    const legend = opts.legend === false ? "" : '<div class="c-legend">' + segments.map((s) =>
      '<div class="c-legend-row"><span class="c-dot" style="background:' + s.color + '"></span>' +
      '<span class="c-legend-label">' + esc(s.label) + "</span>" +
      '<span class="c-legend-val">' + (opts.format ? opts.format(s.value) : s.value) + "</span></div>").join("") + "</div>";
    return '<div class="c-donut">' + svg + legend + "</div>";
  }

  /* line / area chart with optional two series */
  function line(series, opts) {
    opts = opts || {};
    const w = opts.width || 640, h = opts.height || 220;
    const pad = { l: 44, r: 14, t: 16, b: 28 };
    const all = series.flatMap((s) => s.points.map((p) => p.y));
    const maxY = opts.maxY || Math.max(1, ...all) * 1.12;
    const n = series[0].points.length;
    const x = (i) => pad.l + (i / Math.max(1, n - 1)) * (w - pad.l - pad.r);
    const y = (v) => h - pad.b - (v / maxY) * (h - pad.t - pad.b);

    // gridlines
    let grid = "";
    const gy = 4;
    for (let i = 0; i <= gy; i++) {
      const val = (maxY / gy) * i;
      const yy = y(val);
      grid += '<line x1="' + pad.l + '" y1="' + yy + '" x2="' + (w - pad.r) + '" y2="' + yy + '" class="c-grid"/>';
      grid += '<text x="' + (pad.l - 8) + '" y="' + (yy + 3) + '" text-anchor="end" class="c-axis">' +
        (opts.yfmt ? opts.yfmt(val) : Math.round(val)) + "</text>";
    }
    // x labels
    let xlab = "";
    series[0].points.forEach((p, i) => {
      if (p.label && (n <= 12 || i % Math.ceil(n / 12) === 0 || i === n - 1)) {
        xlab += '<text x="' + x(i) + '" y="' + (h - 8) + '" text-anchor="middle" class="c-axis">' + esc(p.label) + "</text>";
      }
    });

    const paths = series.map((s, si) => {
      const color = s.color || "var(--rose)";
      const line = s.points.map((p, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(p.y).toFixed(1)).join(" ");
      const area = s.fill !== false
        ? '<path d="' + line + " L" + x(n - 1) + " " + y(0) + " L" + x(0) + " " + y(0) + ' Z" fill="' + color + '" opacity="0.10"/>'
        : "";
      const dots = s.points.map((p, i) => '<circle cx="' + x(i) + '" cy="' + y(p.y) + '" r="2.5" fill="' + color + '"><title>' +
        esc((p.label || "") + ": " + (opts.yfmt ? opts.yfmt(p.y) : p.y)) + "</title></circle>").join("");
      return area + '<path d="' + line + '" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linejoin="round"/>' + dots;
    }).join("");

    return '<svg viewBox="0 0 ' + w + " " + h + '" class="c-line" preserveAspectRatio="none">' + grid + paths + xlab + "</svg>";
  }

  /* vertical column chart (e.g. weekday load) */
  function columns(rows, opts) {
    opts = opts || {};
    const w = opts.width || 640, h = opts.height || 200;
    const pad = { l: 36, r: 10, t: 14, b: 26 };
    const max = Math.max(1, ...rows.map((r) => r.value));
    const bw = (w - pad.l - pad.r) / rows.length;
    let grid = "";
    for (let i = 0; i <= 3; i++) {
      const val = (max / 3) * i, yy = h - pad.b - (val / max) * (h - pad.t - pad.b);
      grid += '<line x1="' + pad.l + '" y1="' + yy + '" x2="' + (w - pad.r) + '" y2="' + yy + '" class="c-grid"/>';
      grid += '<text x="' + (pad.l - 6) + '" y="' + (yy + 3) + '" text-anchor="end" class="c-axis">' +
        (opts.yfmt ? opts.yfmt(val) : Math.round(val)) + "</text>";
    }
    const bar = rows.map((r, i) => {
      const bh = (r.value / max) * (h - pad.t - pad.b);
      const bx = pad.l + i * bw + bw * 0.18;
      const by = h - pad.b - bh;
      const color = r.color || "var(--rose)";
      return '<rect x="' + bx.toFixed(1) + '" y="' + by.toFixed(1) + '" width="' + (bw * 0.64).toFixed(1) +
        '" height="' + Math.max(0, bh).toFixed(1) + '" rx="4" fill="' + color + '"><title>' +
        esc(r.label + ": " + (opts.yfmt ? opts.yfmt(r.value) : r.value)) + "</title></rect>" +
        '<text x="' + (pad.l + i * bw + bw / 2).toFixed(1) + '" y="' + (h - 9) + '" text-anchor="middle" class="c-axis">' +
        esc(r.label) + "</text>";
    }).join("");
    return '<svg viewBox="0 0 ' + w + " " + h + '" class="c-cols">' + grid + bar + "</svg>";
  }

  /* radial progress ring with label in the centre */
  function ring(pct, opts) {
    opts = opts || {};
    const size = opts.size || 132, sw = opts.stroke || 12;
    const r = (size - sw) / 2, cx = size / 2, cy = size / 2, C = 2 * Math.PI * r;
    const p = Math.max(0, Math.min(1, pct));
    const color = opts.color || "var(--rose)";
    const track = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="var(--cream)" stroke-width="' + sw + '"/>';
    const arc = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + color +
      '" stroke-width="' + sw + '" stroke-linecap="round" stroke-dasharray="' + (p * C).toFixed(2) + " " + ((1 - p) * C).toFixed(2) +
      '" transform="rotate(-90 ' + cx + " " + cy + ')"/>';
    const label = '<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" class="c-ring-num">' + esc(opts.center || Math.round(p * 100) + "%") + "</text>" +
      (opts.sub ? '<text x="' + cx + '" y="' + (cy + 16) + '" text-anchor="middle" class="c-ring-sub">' + esc(opts.sub) + "</text>" : "");
    return '<svg viewBox="0 0 ' + size + " " + size + '" width="' + size + '" height="' + size + '" class="c-ring">' + track + arc + label + "</svg>";
  }

  /* heatmap grid: rows x cols of intensity cells */
  function heatmap(matrix, rowLabels, colLabels, opts) {
    opts = opts || {};
    const color = opts.color || "183, 110, 121"; // rose rgb
    let max = 1;
    matrix.forEach((row) => row.forEach((v) => { if (v > max) max = v; }));
    const head = '<div class="hm-row hm-head"><div class="hm-rowlabel"></div>' +
      colLabels.map((c) => '<div class="hm-cell hm-collabel">' + esc(c) + "</div>").join("") + "</div>";
    const body = matrix.map((row, ri) => {
      const cells = row.map((v, ci) => {
        const a = v === 0 ? 0.04 : 0.14 + (v / max) * 0.86;
        const title = rowLabels[ri] + " " + colLabels[ci] + ": " + (opts.fmt ? opts.fmt(v) : v);
        return '<div class="hm-cell" style="background:rgba(' + color + "," + a.toFixed(2) + ')" title="' + esc(title) + '"></div>';
      }).join("");
      return '<div class="hm-row"><div class="hm-rowlabel">' + esc(rowLabels[ri]) + "</div>" + cells + "</div>";
    }).join("");
    return '<div class="heatmap">' + head + body + "</div>";
  }

  return { bars, donut, line, columns, ring, heatmap, esc };
})();
