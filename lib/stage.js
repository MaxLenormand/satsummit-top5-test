/* Crowd slides: 1920x1080 stage scaled to the window, and beat stepping (as the deck: → / space / click next, ← back).
   URL: ?beat=N starts at beat N (1-based); ?still=1 turns transitions off (screenshots).
   Embedded in the deck (iframe): the parent can post {crowd: "next" | "prev" | "beat", n}; the page posts
   {crowd: "state", beat, beats, ready} after every change, and {crowd: "past-end"} / {crowd: "before-start"} when stepped
   past its last / first beat (the deck then moves to the next / previous slide). */
(function () {
  "use strict";
  const Q = new URLSearchParams(location.search);
  const stage = document.getElementById("stage");
  function fit() {
    const s = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.transform = `translate(${(innerWidth - 1920 * s) / 2}px, ${(innerHeight - 1080 * s) / 2}px) scale(${s})`;
  }
  addEventListener("resize", fit); fit();
  if (Q.get("still")) document.documentElement.classList.add("still");

  const C = { beat: 0, beats: 1, show: () => {}, ready: false, hooks: {} };
  const post = (m) => { if (parent !== window) parent.postMessage(Object.assign({ crowd: "" }, m), "*"); };
  const state = () => post({ crowd: "state", beat: C.beat, beats: C.beats, ready: C.ready });
  C.go = (b, instant) => {
    C.beat = Math.max(0, Math.min(C.beats - 1, b));
    C.show(C.beat, instant);
    state();
  };
  C.next = () => { if (!C.ready) return; if (C.beat < C.beats - 1) C.go(C.beat + 1); else post({ crowd: "past-end" }); };
  C.prev = () => { if (!C.ready) return; if (C.beat > 0) C.go(C.beat - 1); else post({ crowd: "before-start" }); };
  /* a page calls this once its content is built */
  C.start = (beats, show) => {
    C.beats = beats; C.show = show; C.ready = true;
    const q = parseInt(Q.get("beat") || (location.hash || "").replace("#", ""), 10);
    C.go(isFinite(q) ? q - 1 : 0, !!Q.get("still"));
  };
  addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (["ArrowRight", " ", "PageDown", "ArrowDown", "Enter"].includes(e.key)) { e.preventDefault(); C.next(); }
    else if (["ArrowLeft", "PageUp", "ArrowUp", "Backspace"].includes(e.key)) { e.preventDefault(); C.prev(); }
    else if (e.key === "f" || e.key === "F") { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}); }
    else if (C.hooks[e.key]) C.hooks[e.key]();
  });
  stage.addEventListener("click", () => C.next());
  addEventListener("message", (e) => {
    const m = e.data || {};
    if (m.crowd === "next") C.next();
    else if (m.crowd === "prev") C.prev();
    else if (m.crowd === "beat" && C.ready) C.go(m.n | 0, !!m.instant);
    else if (m.crowd && C.hooks[m.crowd]) C.hooks[m.crowd](m);
  });

  /* helpers: SVG and text in stage px */
  const NS = "http://www.w3.org/2000/svg";
  C.svg = (parent, tag, attrs) => {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    parent.appendChild(el);
    return el;
  };
  /* text: anchor [ax, ay] = which point of the text box sits on (x, y) */
  C.text = (parent, x, y, txt, cls, anchor) => {
    const el = document.createElement("div");
    el.className = "lab " + (cls || "");
    el.textContent = txt;
    const a = anchor || [0, 0.5];
    el.style.left = x + "px"; el.style.top = y + "px";
    el.style.transform = `translate(${-a[0] * 100}%, ${-a[1] * 100}%)`;
    parent.appendChild(el);
    return el;
  };
  C.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  window.CrowdStage = C;
})();
