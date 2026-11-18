/* Crowd top-5 game: parse the Google Sheet (gviz JSON), clean the ballots, tally them.
   Pure functions, no DOM. Loaded by a <script> tag in the slides (window.CrowdTally) and by node (require).

   Sheet contract: columns Timestamp (added by Google Forms), rank1..rank5, name, device; values are model ids.
   Found by header label (case and spaces ignored), never by position.

   Cleaning, in this order:
     1. rows before startTime are ignored (startTime "TODO" / empty = no filter)
     2. only the last row per device is kept (rows with no device count as their own device)
     3. ballots with an unknown id, a repeated id or fewer than 5 picks are dropped
   Crowd board: Borda (#1 pick = 5 points ... #5 = 1), ties by number of #1 votes, then alphabetical (name).
   Closest guess: +1 per pick in the real top 5, +1 more when it is at its exact real position (max 10); ties go to
   the earliest timestamp. Only ballots with a name can be the closest guess (the only name ever shown). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CrowdTally = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const norm = (s) => String(s == null ? "" : s).trim().toLowerCase().replace(/[\s_-]+/g, "");

  /* gviz text ("/*O_o*\/\ncb({...});") or the object passed to the callback -> the response object */
  function parseGvizText(text) {
    if (text && typeof text === "object") return text;
    const s = String(text), a = s.indexOf("{"), b = s.lastIndexOf("}");
    if (a < 0 || b < a) throw new Error("not a gviz response");
    return JSON.parse(s.slice(a, b + 1));
  }

  /* offset (minutes, local - UTC) of an IANA time zone at a given UTC instant; null when unknown */
  function tzOffsetMin(tz, utcMs) {
    if (!tz) return null;
    try {
      const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit",
        day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const p = {}; for (const x of f.formatToParts(new Date(utcMs))) p[x.type] = x.value;
      const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
      return Math.round((asUtc - utcMs) / 60000);
    } catch (e) { return null; }
  }

  /* wall-clock fields in a zone (or the machine's local zone) -> epoch ms */
  function wallToMs(y, mo, d, h, mi, s, ms, tz) {
    if (!tz) return new Date(y, mo, d, h, mi, s, ms).getTime();
    const guess = Date.UTC(y, mo, d, h, mi, s, ms);
    let off = tzOffsetMin(tz, guess);
    if (off == null) return new Date(y, mo, d, h, mi, s, ms).getTime();
    let t = guess - off * 60000;
    const off2 = tzOffsetMin(tz, t);            // DST edge: one correction
    if (off2 != null && off2 !== off) t = guess - off2 * 60000;
    return t;
  }

  /* a gviz cell value -> epoch ms. gviz sends datetimes as "Date(2026,10,18,9,3,12)" (month 0-based, the sheet's
     own time zone, no zone given); a plain-text timestamp ("18/11/2026 09:03:12" or ISO) is also accepted. */
  function parseTime(v, f, tz) {
    if (v == null && f == null) return NaN;
    if (typeof v === "number") return v;
    const s = String(v != null ? v : f);
    let m = /^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+)(?:,(\d+))?)?\)$/.exec(s);
    if (m) return wallToMs(+m[1], +m[2], +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0), +(m[7] || 0), tz);
    m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);               // ISO without a zone
    if (m) return wallToMs(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0), 0, tz);
    m = /^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);           // M/D/YYYY (US sheets)
    if (m) return wallToMs(+m[3], +m[1] - 1, +m[2], +m[4], +m[5], +(m[6] || 0), 0, tz);
    const t = Date.parse(s);
    return isNaN(t) ? NaN : t;
  }

  /* startTime from the config: ISO with a zone, ISO without (read in tz, else machine-local), epoch ms, or
     "TODO" / empty (no filter -> -Infinity) */
  function parseStart(st, tz) {
    if (st == null || st === "" || /todo/i.test(String(st))) return -Infinity;
    if (typeof st === "number") return st;
    const s = String(st).trim();
    if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) { const t = Date.parse(s); return isNaN(t) ? -Infinity : t; }
    const t = parseTime(s, null, tz);
    return isNaN(t) ? -Infinity : t;
  }

  /* the DataTable -> records [{row, ts, picks[5], name, device}] (raw, uncleaned) */
  function tableToRecords(resp, opt) {
    const o = opt || {}, table = resp && resp.table;
    if (!table || !table.cols) return [];
    const idx = {};
    table.cols.forEach((c, i) => { const k = norm(c.label || ""); if (k && !(k in idx)) idx[k] = i; });
    // the header row may also arrive as the first data row when gviz guesses headers=0; labels then are "" or A, B...
    let rows = table.rows || [];
    if (!("rank1" in idx) && rows.length) {
      const first = (rows[0].c || []).map((c) => norm(c && (c.v != null ? c.v : c.f)));
      if (first.includes("rank1")) { first.forEach((k, i) => { if (k && !(k in idx)) idx[k] = i; }); rows = rows.slice(1); }
    }
    const get = (r, key) => {
      const i = idx[key];
      if (i == null) return null;
      const c = (r.c || [])[i];
      return c == null ? null : c.v != null ? c.v : c.f != null ? c.f : null;
    };
    const getF = (r, key) => { const i = idx[key]; const c = i == null ? null : (r.c || [])[i]; return c ? c.f : null; };
    return rows.map((r, row) => {
      const picks = [1, 2, 3, 4, 5].map((k) => { const v = get(r, "rank" + k); return v == null ? "" : String(v).trim(); });
      const name = get(r, "name"), device = get(r, "device");
      return { row, ts: parseTime(get(r, "timestamp"), getF(r, "timestamp"), o.tz), picks,
        name: name == null ? "" : String(name).trim(), device: device == null ? "" : String(device).trim() };
    });
  }

  /* models.json -> lookups */
  function modelIndex(models) {
    const list = (models && models.models) || models || [];
    const byId = new Map(), byNorm = new Map();
    for (const m of list) { byId.set(m.id, m); byNorm.set(norm(m.id), m); }
    const realTop = list.filter((m) => m.in_top5).sort((a, b) => a.real_rank - b.real_rank);
    return { list, byId, byNorm, realTop };
  }

  /* records -> clean ballots, with a count of what was dropped and why */
  function clean(records, models, opt) {
    const o = opt || {}, M = modelIndex(models), start = parseStart(o.startTime, o.tz);
    const drop = { early: 0, superseded: 0, invalid: 0 };
    const kept = [];
    for (const r of records) {
      if (!isNaN(r.ts) && r.ts < start) { drop.early++; continue; }
      if (isNaN(r.ts) && start > -Infinity) { drop.early++; continue; }   // no time and a filter is on: can't tell
      kept.push(r);
    }
    // last row per device (latest timestamp, then latest row)
    const last = new Map();
    kept.forEach((r) => {
      const key = r.device ? "d:" + r.device : "row:" + r.row;
      const p = last.get(key);
      if (!p || (r.ts > p.ts || (!(r.ts < p.ts) && r.row > p.row))) last.set(key, r);
    });
    drop.superseded = kept.length - last.size;
    const ballots = [];
    for (const r of last.values()) {
      const ids = r.picks.map((p) => { const m = M.byNorm.get(norm(p)); return m ? m.id : null; });
      if (ids.some((x) => !x) || new Set(ids).size !== 5) { drop.invalid++; continue; }
      ballots.push({ row: r.row, ts: r.ts, picks: ids, name: r.name, device: r.device });
    }
    ballots.sort((a, b) => (a.ts - b.ts) || (a.row - b.row));
    return { ballots, drop, raw: records.length };
  }

  /* Borda board over every model: [{id, name, points, first, inTop5Votes, rank}] */
  function borda(ballots, models) {
    const M = modelIndex(models), s = new Map();
    for (const m of M.list) s.set(m.id, { id: m.id, name: m.name, points: 0, first: 0, picked: 0 });
    for (const b of ballots) b.picks.forEach((id, i) => {
      const x = s.get(id); if (!x) return;
      x.points += 5 - i; x.picked++; if (i === 0) x.first++;
    });
    const board = [...s.values()].sort((a, b) => b.points - a.points || b.first - a.first ||
      String(a.name).localeCompare(String(b.name), "en", { sensitivity: "base" }));
    board.forEach((x, i) => { x.rank = i + 1; });
    return board;
  }

  function score(picks, realTop) {
    let s = 0;
    picks.forEach((id, i) => { const k = realTop.findIndex((m) => m.id === id); if (k >= 0) { s++; if (k === i) s++; } });
    return s;
  }

  /* the closest guess among named ballots (earliest wins a tie); null if nobody named themselves */
  function closest(ballots, models) {
    const M = modelIndex(models);
    let best = null;
    for (const b of ballots) {
      if (!b.name) continue;
      const sc = score(b.picks, M.realTop);
      if (!best || sc > best.score || (sc === best.score && b.ts < best.ballot.ts)) best = { score: sc, ballot: b };
    }
    if (best) best.tied = ballots.filter((b) => b.name && score(b.picks, M.realTop) === best.score).length;
    return best;
  }

  /* everything a slide needs, from the raw gviz response */
  function tally(resp, models, opt) {
    const M = modelIndex(models);
    const records = tableToRecords(resp, opt);
    const c = clean(records, models, opt);
    const n = c.ballots.length, top = M.realTop, topIds = new Set(top.map((m) => m.id));
    const no1 = top[0] ? c.ballots.filter((b) => b.picks[0] === top[0].id).length : 0;
    const all5 = c.ballots.filter((b) => b.picks.every((id) => topIds.has(id))).length;
    const exact = c.ballots.filter((b) => b.picks.every((id, i) => top[i] && top[i].id === id)).length;
    return { n, ballots: c.ballots, drop: c.drop, raw: c.raw, board: borda(c.ballots, models), realTop: top,
      no1, all5, exact, closest: closest(c.ballots, models) };
  }

  return { parseGvizText, tableToRecords, parseTime, parseStart, clean, borda, score, closest, tally, modelIndex, norm };
});
