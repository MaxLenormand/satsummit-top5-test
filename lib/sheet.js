/* Crowd top-5 game: config, models and the Google Sheet, for the slides (browser only, works from file://).

   The Sheet is read with the gviz endpoint in its JSONP form (a <script> tag, so no CORS and no server):
     https://docs.google.com/spreadsheets/d/<sheetId>/gviz/tq?tqx=out:json;responseHandler:<cb>&sheet=<tab>&headers=1
   It answers "/*O_o*\/\n<cb>({version, status, table: {cols: [{label}], rows: [{c: [{v, f}]}]}})" (checked on a public
   sheet, 2026-11-17: ~0.3 s, "cache-control: no-store", an unknown tab name silently returns the FIRST tab, a sheet
   that is not shared "anyone with the link" answers 401 = no callback). Each call: 4 s timeout, then retries.

   URL switches (any page):  ?mock=fixtures  the fake 60-ballot sheet (crowd/fixtures/sheet.gviz.js)
                             ?mock=3         a 3-ballot sheet          ?mock=empty  a sheet with no rows
                             ?mock=0         the Sheet can't be reached (fallback)
                             ?mock=live      fixtures arriving over ~40 s (for the QR counter) */
(function () {
  "use strict";
  const Q = new URLSearchParams(location.search);
  const MOCK = Q.get("mock");
  const here = (document.currentScript && document.currentScript.src) || location.href;
  const libUrl = (p) => new URL(p, here).href;                 // paths relative to crowd/lib/

  const DEFAULTS = { formAction: "TODO", entries: {}, sheetId: "TODO", sheetTab: "Form Responses 1", voteUrl: "TODO",
    startTime: "TODO",
    // the Sheet's own time zone (File > Settings): gviz sends Timestamp as wall-clock "Date(y,m0,d,h,mi,s)" in it, with
    // no zone. The live sheet (2026-11-17) is America/Chicago; crowd/config.js may override it.
    sheetTimeZone: "America/Chicago" };

  function config() {
    const c = Object.assign({}, DEFAULTS, window.CROWD_CONFIG || {});
    if (MOCK && window.CROWD_FIXTURE_META) c.startTime = window.CROWD_FIXTURE_META.startTime;
    if (MOCK && window.CROWD_FIXTURE_META) c.sheetTimeZone = window.CROWD_FIXTURE_META.sheetTimeZone;
    if (!isSet(c.sheetTimeZone)) c.sheetTimeZone = DEFAULTS.sheetTimeZone;
    return c;
  }
  const isSet = (v) => v != null && v !== "" && !/todo/i.test(String(v));

  function script(src, timeoutMs) {
    return new Promise((ok, no) => {
      const s = document.createElement("script");
      let done = false;
      const end = (f, x) => { if (done) return; done = true; clearTimeout(t); s.remove(); f(x); };
      const t = setTimeout(() => end(no, new Error("timeout")), timeoutMs || 4000);
      s.onload = () => end(ok);
      s.onerror = () => end(no, new Error("load error"));
      s.src = src;
      document.head.appendChild(s);
    });
  }

  /* models.json: fetched when served over http(s); from file:// (no fetch) the generated copy lib/models-fallback.js */
  async function models() {
    if (window.CROWD_MODELS) return window.CROWD_MODELS;
    if (location.protocol !== "file:") {
      try {
        const r = await fetch(libUrl("../models.json"), { cache: "no-store" });
        if (r.ok) return (window.CROWD_MODELS = await r.json());
      } catch (e) { /* fall through */ }
    }
    try { await script(libUrl("../models.js"), 3000); } catch (e) { /* optional */ }
    if (window.CROWD_MODELS) return window.CROWD_MODELS;
    if (!window.CROWD_MODELS_FALLBACK) { try { await script(libUrl("models-fallback.js"), 3000); } catch (e) { /* */ } }
    return (window.CROWD_MODELS = window.CROWD_MODELS_FALLBACK || { models: [] });
  }

  let seq = 0;
  /* one JSONP call -> the gviz response object (rejects on timeout, 401, status "error") */
  function gvizOnce(src, cb, timeoutMs) {
    return new Promise((ok, no) => {
      let got = null;
      window[cb] = (resp) => { got = resp; };
      script(src, timeoutMs).then(() => {
        delete window[cb];
        if (!got) return no(new Error("no callback"));
        if (got.status === "error") return no(new Error("gviz error"));
        ok(got);
      }, (e) => { window[cb] = () => {}; no(e); });   // a late answer after the timeout is swallowed
    });
  }

  let liveT0 = 0;
  /* the sheet's response, with retries. opts: {timeout, retries} */
  async function fetchSheet(cfg, opts) {
    const o = Object.assign({ timeout: 4000, retries: 2 }, opts || {});
    if (MOCK === "0") throw new Error("mock: no sheet");
    if (MOCK) {
      const file = MOCK === "3" ? "sheet3.gviz.js" : MOCK === "empty" ? "sheet-empty.gviz.js" : "sheet.gviz.js";
      const resp = await gvizOnce(libUrl("../fixtures/" + file), "crowdFixture", o.timeout);
      if (MOCK === "live") {                                       // rows arrive over ~40 s
        if (!liveT0) liveT0 = Date.now();
        const k = Math.floor(((Date.now() - liveT0) / 40000) * resp.table.rows.length);
        resp.table.rows = resp.table.rows.slice(0, Math.max(0, k));
      }
      return resp;
    }
    if (!isSet(cfg.sheetId)) throw new Error("no sheetId");
    let err;
    for (let a = 0; a <= o.retries; a++) {
      const cb = "__crowdGviz" + ++seq + "_" + Date.now().toString(36);
      const src = "https://docs.google.com/spreadsheets/d/" + encodeURIComponent(cfg.sheetId) +
        "/gviz/tq?tqx=out:json;responseHandler:" + cb + "&headers=1" +
        (isSet(cfg.sheetTab) ? "&sheet=" + encodeURIComponent(cfg.sheetTab) : "") + "&_=" + Date.now();
      try { return await gvizOnce(src, cb, o.timeout); } catch (e) { err = e; }
      if (a < o.retries) await new Promise((r) => setTimeout(r, 600 * (a + 1)));
    }
    throw err;
  }

  /* fetch + tally in one go; rejects when the sheet can't be read */
  async function load(opts) {
    const cfg = config(), m = await models();
    const resp = await fetchSheet(cfg, opts);
    return { cfg, models: m, result: CrowdTally.tally(resp, m, { startTime: cfg.startTime, tz: cfg.sheetTimeZone || "" }) };
  }

  window.CrowdSheet = { config, models, fetchSheet, load, isSet, mock: MOCK };
})();
