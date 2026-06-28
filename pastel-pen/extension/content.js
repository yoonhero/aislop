(() => {
  const api = globalThis.browser || globalThis.chrome;
  const KEY = "pastelPen.highlights.v1";
  const COLORS = [
    ["lemon", "#fff176", "255,241,118"],
    ["mint", "#b8f7d4", "184,247,212"],
    ["peach", "#ffc6a8", "255,198,168"],
    ["rose", "#ffb7cf", "255,183,207"],
    ["sky", "#bfe4ff", "191,228,255"],
    ["lilac", "#d9c7ff", "217,199,255"]
  ];
  const BAD = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "SELECT", "OPTION", "NOSCRIPT", "IFRAME"]);
  const css = String.raw;
  const state = { items: [], lastRange: null, activeMarkId: null, tip: null, tipBody: null, deleteButton: null, color: COLORS[0][1] };
  const page = () => location.href.split("#")[0];
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  const storage = {
    async get() { return (await api.storage.local.get(KEY))[KEY] || { items: [], prefs: {} }; },
    async set(data) { await api.storage.local.set({ [KEY]: data }); }
  };

  init().catch(console.warn);

  async function init() {
    injectTip();
    const data = await storage.get();
    state.items = data.items || [];
    state.color = data.prefs?.color || COLORS[0][1];
    restoreSoon();
    addEventListener("mouseup", captureSelection, true);
    addEventListener("keyup", (e) => /^(Shift|Arrow|Home|End)/.test(e.key) && captureSelection(), true);
    addEventListener("click", markMenu, true);
    addEventListener("scroll", hideTip, true);
    api.runtime.onMessage.addListener((m) => m?.type === "PASTEL_PEN_HIGHLIGHT_CONTEXT" && commit(state.color));
    new MutationObserver(debounce(restoreSoon, 600)).observe(document.body || document.documentElement, { childList: true, subtree: true });
  }

  function injectTip() {
    const host = document.createElement("div");
    host.id = "pastel-pen";
    Object.assign(host.style, { all: "initial", position: "fixed", zIndex: 2147483647 });
    const root = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = css`
        :host{all:initial}
        .tip{align-items:center;background:#fffdf2;border:1px solid #e6dcc5;border-radius:999px;box-shadow:0 10px 30px #33280024,0 2px 8px #33280018;color:#3e392c;display:flex;font:13px/1.2 ui-sans-serif,system-ui,sans-serif;gap:6px;padding:6px;user-select:none}
        button{appearance:none;border:0;cursor:pointer;font:inherit}
        .dot{border-radius:999px;box-shadow:inset 0 0 0 1px #7a6c4533;height:24px;width:24px}
        .dot:hover{transform:translateY(-1px)}
        .act{background:#3f3828;border-radius:999px;color:#fff8df;padding:6px 10px}
        .ghost{background:transparent;border-radius:999px;color:#625946;padding:6px 8px}
        .danger{background:#ffe4e8;border-radius:999px;color:#8b3142;min-width:96px;padding:8px 16px}
        .tip[data-mode="mark"]{min-width:128px}
        .tip[data-mode="mark"] .dot,.tip[data-mode="mark"] .act,.tip[data-mode="mark"] .ghost{display:none}
        .tip:not([data-mode="mark"]) .danger{display:none}
      `;
    const tip = document.createElement("div");
    tip.className = "tip";
    tip.part = "tip";
    for (const [name, color] of COLORS) {
      const b = document.createElement("button");
      b.className = "dot";
      b.title = name;
      b.dataset.color = color;
      b.style.background = color;
      b.addEventListener("click", () => commit(color));
      tip.append(b);
    }
    const save = Object.assign(document.createElement("button"), { className: "act", textContent: "save" });
    save.dataset.act = "save";
    save.addEventListener("click", () => commit(state.color));
    const review = Object.assign(document.createElement("button"), { className: "ghost", textContent: "review" });
    review.dataset.act = "review";
    review.addEventListener("click", () => api.runtime.sendMessage({ type: "PASTEL_PEN_OPEN_REVIEW", q: clean(state.lastRange?.toString()).slice(0, 80) }));
    const del = Object.assign(document.createElement("button"), { className: "danger", textContent: "delete" });
    del.dataset.act = "delete";
    del.addEventListener("click", () => removeHighlight(del.dataset.targetId || state.activeMarkId));
    tip.append(save, review, del);
    root.append(style, tip);
    state.tipBody = tip;
    state.deleteButton = del;
    host.addEventListener("click", (e) => {
      if (state.tipBody?.dataset.mode !== "mark") return;
      e.preventDefault();
      e.stopPropagation();
      removeHighlight(state.deleteButton.dataset.targetId || state.activeMarkId);
    });
    document.documentElement.append(host);
    state.tip = host;
    hideTip();
  }

  function captureSelection() {
    const sel = getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return hideTip();
    const range = sel.getRangeAt(0);
    if (!document.body.contains(range.commonAncestorContainer) || clean(range.toString()).length < 1) return hideTip();
    state.lastRange = range.cloneRange();
    const rect = range.getClientRects()[0] || range.getBoundingClientRect();
    if (!rect || !Number.isFinite(rect.left)) return;
    showTip(rect, "select");
  }

  function markMenu(event) {
    const mark = event.target.closest?.(".pastel-pen-mark");
    if (!mark) return;
    event.stopPropagation();
    state.activeMarkId = mark.dataset.pastelPenId;
    state.deleteButton.dataset.targetId = state.activeMarkId;
    state.lastRange = null;
    showTip(mark.getBoundingClientRect(), "mark");
  }

  async function commit(color) {
    const range = state.lastRange?.cloneRange();
    if (!range || range.collapsed || !clean(range.toString())) return hideTip();
    state.color = color;
    const record = serialize(range, color);
    paint(range, record);
    const data = await storage.get();
    const items = [record, ...(data.items || []).filter((x) => x.id !== record.id)];
    await storage.set({ items, prefs: { ...(data.prefs || {}), color } });
    state.items = items;
    getSelection()?.removeAllRanges();
    hideTip();
  }

  async function removeHighlight(id) {
    if (!id) return hideTip();
    const data = await storage.get();
    const items = (data.items || []).filter((x) => x.id !== id);
    document.querySelectorAll(`[data-pastel-pen-id="${CSS.escape(id)}"]`).forEach(unwrap);
    await storage.set({ ...data, items });
    state.items = items;
    hideTip();
  }

  function serialize(range, color) {
    const text = docText();
    const start = offsetOf(range.startContainer, range.startOffset);
    const exact = fragmentText(range);
    const prefix = text.slice(Math.max(0, start - 80), start);
    const suffix = text.slice(start + exact.length, start + exact.length + 80);
    const rgb = COLORS.find((x) => x[1] === color)?.[2] || COLORS[0][2];
    return {
      id: hash([page(), exact, start, Date.now()].join("\n")),
      url: page(),
      title: document.title,
      exact,
      quote: clean(exact),
      prefix: clean(prefix),
      suffix: clean(suffix),
      start,
      end: start + exact.length,
      path: pathOf(range.startContainer),
      offset: range.startOffset,
      color,
      rgb,
      createdAt: new Date().toISOString()
    };
  }

  function restoreSoon() {
    requestAnimationFrame(() => restore().catch(console.warn));
  }

  async function restore() {
    const data = await storage.get();
    state.items = data.items || [];
    const mine = state.items.filter((x) => samePage(x.url) && !document.querySelector(`[data-pastel-pen-id="${CSS.escape(x.id)}"]`));
    for (const item of mine) {
      const range = locate(item);
      if (range) paint(range, item);
    }
  }

  function samePage(url) {
    try { return new URL(url).href.split("#")[0] === page(); }
    catch { return url === page(); }
  }

  function locate(item) {
    const text = docText();
    if (text.slice(item.start, item.end) === item.exact) return rangeFromOffsets(item.start, item.end);
    const spots = indexes(text, item.exact);
    if (spots.length === 1) return rangeFromOffsets(spots[0], spots[0] + item.exact.length);
    const candidates = spots.map((i) => ({ i, score: score(item, i, text) })).filter((x) => x.score < 42).sort((a, b) => a.score - b.score);
    if (candidates[0]) return rangeFromOffsets(candidates[0].i, candidates[0].i + item.exact.length);
    const node = nodeAt(item.path);
    if (node?.nodeType === Node.TEXT_NODE && node.data.slice(item.offset, item.offset + item.exact.length) === item.exact) {
      const r = document.createRange();
      r.setStart(node, item.offset);
      r.setEnd(node, item.offset + item.exact.length);
      return r;
    }
    return null;
  }

  function score(item, i, text) {
    const near = Math.abs(i - item.start) / 120;
    const pre = item.prefix ? distance(item.prefix, clean(text.slice(Math.max(0, i - 100), i))) : 0;
    const suf = item.suffix ? distance(item.suffix, clean(text.slice(i + item.exact.length, i + item.exact.length + 100))) : 0;
    return near + pre + suf;
  }

  function paint(range, item) {
    for (const node of textNodes(range)) {
      let [a, b] = overlap(range, node);
      if (b <= a || !node.data.slice(a, b).trim()) continue;
      const mark = document.createElement("mark");
      mark.className = "pastel-pen-mark";
      mark.classList.add(darkSurface(node.parentElement) ? "pastel-pen-mark--dark-surface" : "pastel-pen-mark--light-surface");
      mark.dataset.pastelPenId = item.id;
      mark.style.setProperty("--pastel-pen-color", item.color);
      mark.style.setProperty("--pastel-pen-rgb", item.rgb || COLORS[0][2]);
      mark.title = "Pastel Pen";
      const tail = node.splitText(b);
      const middle = node.splitText(a);
      mark.append(middle.cloneNode(true));
      middle.replaceWith(mark);
      node.normalize?.();
      tail.normalize?.();
    }
  }

  function overlap(range, node) {
    let a = 0, b = node.data.length;
    if (node === range.startContainer) a = range.startOffset;
    else if (node.compareDocumentPosition(range.startContainer) & Node.DOCUMENT_POSITION_CONTAINED_BY) a = textBefore(node, range.startContainer, range.startOffset);
    if (node === range.endContainer) b = range.endOffset;
    else if (node.compareDocumentPosition(range.endContainer) & Node.DOCUMENT_POSITION_CONTAINED_BY) b = textBefore(node, range.endContainer, range.endOffset);
    return [Math.max(0, a), Math.min(node.data.length, b)];
  }

  function textBefore(root, node, offset) {
    const r = document.createRange();
    r.setStart(root, 0);
    r.setEnd(node, offset);
    return fragmentText(r).length;
  }

  function showTip(rect, mode) {
    const w = mode === "mark" ? 180 : 292;
    const h = 48;
    const gap = 10;
    const below = rect.bottom + gap + h < innerHeight;
    const x = Math.max(8, Math.min(innerWidth - w - 8, rect.right + gap < innerWidth - w ? rect.right + gap : rect.left));
    const y = below ? rect.bottom + gap : Math.max(8, rect.top - h - gap);
    state.tipBody.dataset.mode = mode === "mark" ? "mark" : "select";
    Object.assign(state.tip.style, { display: "block", left: `${x}px`, top: `${y}px` });
  }

  function unwrap(mark) {
    const parent = mark.parentNode;
    mark.replaceWith(document.createTextNode(mark.textContent));
    parent?.normalize();
  }

  function textNodes(range) {
    const root = range.commonAncestorContainer.nodeType === Node.TEXT_NODE ? range.commonAncestorContainer.parentNode : range.commonAncestorContainer;
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => usableText(n, true) && range.intersectsNode(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
    return [...walk(tw)];
  }

  function offsetOf(node, offset) {
    const r = document.createRange();
    r.setStart(document.body, 0);
    r.setEnd(node, offset);
    return fragmentText(r).length;
  }

  function rangeFromOffsets(start, end) {
    let at = 0, r = document.createRange(), opened = false;
    for (const n of textStream()) {
      const next = at + n.data.length;
      if (!opened && start <= next) r.setStart(n, Math.max(0, start - at)), opened = true;
      if (opened && end <= next) return r.setEnd(n, Math.max(0, end - at)), r;
      at = next;
    }
    return null;
  }

  function pathOf(node) {
    const path = [];
    for (let n = node; n && n !== document.body; n = n.parentNode) path.push([...n.parentNode.childNodes].indexOf(n));
    return path.reverse();
  }

  function nodeAt(path = []) {
    return path.reduce((n, i) => n?.childNodes?.[i], document.body);
  }

  function docText() {
    return textStream().map((n) => n.data).join("");
  }

  function textStream(root = document.body) {
    if (!root) return [];
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => usableText(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
    return [...walk(tw)];
  }

  function fragmentText(range) {
    const div = document.createElement("div");
    div.append(range.cloneContents());
    return textStream(div).map((n) => n.data).join("");
  }

  function usableText(node, skipMarks = false) {
    const el = node.parentElement;
    return !!el && !BAD.has(el.tagName) && !el.closest(`${skipMarks ? ".pastel-pen-mark," : ""}#pastel-pen,[hidden],[aria-hidden='true']`);
  }

  function darkSurface(el) {
    const ink = rgba(getComputedStyle(el).color);
    const bg = surfaceColor(el);
    return bg ? luminance(bg) < .36 : ink && luminance(ink) > .72;
  }

  function surfaceColor(el) {
    for (let n = el; n && n.nodeType === Node.ELEMENT_NODE; n = n.parentElement) {
      const c = rgba(getComputedStyle(n).backgroundColor);
      if (c && c[3] > .12) return c;
    }
    return rgba(getComputedStyle(document.documentElement).backgroundColor) || rgba(getComputedStyle(document.body).backgroundColor);
  }

  function rgba(s) {
    const m = String(s).match(/rgba?\(([^)]+)\)/i);
    if (!m) return null;
    const xs = m[1].split(/,\s*|\s+\/\s*|\s+/).map((x) => Number.parseFloat(x));
    return xs.length >= 3 ? [xs[0], xs[1], xs[2], xs[3] ?? 1] : null;
  }

  function luminance([r, g, b]) {
    const [R, G, B] = [r, g, b].map((x) => {
      x /= 255;
      return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4;
    });
    return .2126 * R + .7152 * G + .0722 * B;
  }

  function* walk(tw) { for (let n; (n = tw.nextNode());) yield n; }
  function indexes(hay, needle) { const a = []; for (let i = hay.indexOf(needle); i >= 0; i = hay.indexOf(needle, i + 1)) a.push(i); return a; }
  function distance(a, b) { return Math.abs(a.length - b.length) + (a === b ? 0 : a.slice(-24) === b.slice(-24) ? 3 : 12); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return `pp_${(h >>> 0).toString(36)}`; }
  function hideTip() {
    if (!state.tip) return;
    state.tip.style.display = "none";
    state.activeMarkId = null;
  }
  function debounce(fn, wait) { let t; return (...xs) => (clearTimeout(t), t = setTimeout(() => fn(...xs), wait)); }
})();
