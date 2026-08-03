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
  const SCOPE = globalThis.PastelPenScope;
  const DEFAULT_ENABLED = SCOPE.DEFAULT_ENABLED;
  const BAD = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "SELECT", "OPTION", "NOSCRIPT", "IFRAME"]);
  const css = String.raw;
  const state = {
    items: [], lastRange: null, activeMarkId: null, tip: null, tipBody: null,
    deleteButton: null, colorButton: null, color: COLORS[0][1], enabled: DEFAULT_ENABLED,
    expanded: false, anchor: null, observer: null, eventsBound: false, finishTimer: null
  };
  const page = () => SCOPE.cleanPage(location.href);
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  const storage = {
    async get() { return normalize((await api.storage.local.get(KEY))[KEY]); },
    async set(data) { await api.storage.local.set({ [KEY]: data }); }
  };

  init().catch(console.warn);

  async function init() {
    const data = await storage.get();
    state.items = data.items || [];
    state.color = data.prefs?.color || COLORS[0][1];
    state.enabled = SCOPE.pageEnabled(data.prefs, page());
    api.runtime.onMessage.addListener((m) => {
      if (m?.type === "PASTEL_PEN_HIGHLIGHT_CONTEXT") return commit(state.color);
      if (m?.type === "PASTEL_PEN_GET_PAGE_STATE") return Promise.resolve({ enabled: state.enabled, url: page() });
      if (m?.type === "PASTEL_PEN_SET_PAGE_STATE") return setScopeEnabled("page", m.enabled !== false);
      if (m?.type === "PASTEL_PEN_SET_SCOPE_STATE") return setScopeEnabled(m.scope, m.enabled !== false);
      if (m?.type === "PASTEL_PEN_TOGGLE_PAGE") return setScopeEnabled("page", !state.enabled);
      if (m?.type === "PASTEL_PEN_RECOLOR") return recolorHighlight(m.id, m.color);
      if (m?.type === "PASTEL_PEN_REMOVE") return removeHighlight(m.id);
    });
    if (state.enabled) activate();
  }

  function activate() {
    if (!state.tip) injectTip();
    if (state.eventsBound) return restoreSoon();
    addEventListener("pointerdown", prepareSelection, true);
    addEventListener("pointerup", finishSelection, true);
    addEventListener("mouseup", finishSelection, true);
    addEventListener("selectionchange", captureSelection, true);
    addEventListener("keyup", updateSelection, true);
    addEventListener("click", markMenu, true);
    addEventListener("scroll", repositionTip, true);
    addEventListener("resize", repositionTip, true);
    state.observer = new MutationObserver(debounce(() => state.enabled && restoreSoon(), 600));
    state.observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    state.eventsBound = true;
    restoreSoon();
  }

  function deactivate() {
    if (state.eventsBound) {
      removeEventListener("pointerdown", prepareSelection, true);
      removeEventListener("pointerup", finishSelection, true);
      removeEventListener("mouseup", finishSelection, true);
      removeEventListener("selectionchange", captureSelection, true);
      removeEventListener("keyup", updateSelection, true);
      removeEventListener("click", markMenu, true);
      removeEventListener("scroll", repositionTip, true);
      removeEventListener("resize", repositionTip, true);
    }
    state.observer?.disconnect();
    state.observer = null;
    state.eventsBound = false;
    clearTimeout(state.selectionTimer);
    clearTimeout(state.finishTimer);
    document.documentElement.classList.remove("pastel-pen-selection-active");
    clearMarks();
    hideTip();
    state.lastRange = null;
    state.tip?.remove();
    state.tip = state.tipBody = state.deleteButton = state.colorButton = null;
  }

  function injectTip() {
    const host = document.createElement("div");
    host.id = "pastel-pen";
    Object.assign(host.style, { all: "initial", position: "fixed", zIndex: 2147483647 });
    const root = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = css`
      :host{all:initial}
      .tip{align-items:center;background:#fffdf2;border:1px solid #e6dcc5;border-radius:10px;box-shadow:0 8px 22px #33280020,0 2px 7px #33280014;color:#3e392c;display:flex;font:12px/1.2 ui-sans-serif,system-ui,sans-serif;gap:4px;max-width:calc(100vw - 16px);padding:4px;position:relative;user-select:none}
      .tip:before{background:#fffdf2;border:1px solid #e6dcc5;content:"";height:7px;position:absolute;transform:rotate(45deg);width:7px;z-index:0}
      .tip>*{position:relative;z-index:1}
      .tip[data-side="right"]:before{left:-4px;top:13px;border-right:0;border-top:0}
      .tip[data-side="left"]:before{right:-4px;top:13px;border-left:0;border-bottom:0}
      .tip[data-side="bottom"]:before{left:16px;top:-4px;border-right:0;border-bottom:0}
      .tip[data-side="top"]:before{bottom:-4px;left:16px;border-left:0;border-top:0}
      button{appearance:none;border:0;cursor:pointer;font:inherit}
      .swatch{background:#fff176;border-radius:7px;box-shadow:inset 0 0 0 1px #7a6c4533;height:25px;padding:0;width:25px}
      .swatch:hover{transform:translateY(-1px)}
      .palette{display:none;flex-wrap:wrap;gap:3px;max-width:calc(100vw - 88px)}
      .tip[data-expanded="true"] .palette{display:flex}
      .dot{border-radius:5px;box-shadow:inset 0 0 0 1px #7a6c4533;height:21px;padding:0;width:21px}
      .dot:hover{transform:translateY(-1px)}
      .dot[aria-pressed="true"]{box-shadow:inset 0 0 0 2px #fffdf2,0 0 0 1px #3e392c}
      .act,.danger{border-radius:7px;min-height:25px;padding:0 8px}
      .act{background:#3f3828;color:#fff8df}
      .danger{background:#ffe4e8;color:#8b3142}
      .tip[data-mode="select"] .danger{display:none}
      .tip[data-mode="mark"] .act{display:none}
    `;
    const tip = document.createElement("div");
    tip.className = "tip";
    tip.part = "tip";
    tip.dataset.mode = "select";
    tip.dataset.expanded = "false";
    tip.role = "toolbar";
    tip.ariaLabel = "Pastel Pen actions";
    const colorButton = document.createElement("button");
    colorButton.className = "swatch";
    colorButton.type = "button";
    colorButton.addEventListener("click", (event) => {
      event.stopPropagation();
      state.expanded = !state.expanded;
      renderTip();
      repositionTip();
    });
    const palette = document.createElement("div");
    palette.className = "palette";
    palette.role = "group";
    palette.ariaLabel = "Highlight colour";
    for (const [name, color] of COLORS) {
      const b = document.createElement("button");
      b.className = "dot";
      b.type = "button";
      b.title = name;
      b.ariaLabel = `Change highlight to ${name}`;
      b.dataset.color = color;
      b.style.background = color;
      b.addEventListener("click", (event) => { event.stopPropagation(); pickColor(color); });
      palette.append(b);
    }
    const save = Object.assign(document.createElement("button"), { className: "act", textContent: "mark" });
    save.type = "button";
    save.dataset.act = "save";
    save.addEventListener("click", () => commit(state.color));
    const del = Object.assign(document.createElement("button"), { className: "danger", textContent: "remove" });
    del.type = "button";
    del.dataset.act = "delete";
    del.addEventListener("click", () => removeHighlight(del.dataset.targetId || state.activeMarkId));
    tip.append(colorButton, palette, save, del);
    root.append(style, tip);
    state.tipBody = tip;
    state.deleteButton = del;
    state.colorButton = colorButton;
    document.documentElement.append(host);
    state.tip = host;
    renderTip();
    hideTip();
  }

  function captureSelection() {
    if (!state.enabled) return false;
    const sel = getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return false;
    const range = sel.getRangeAt(0);
    if (!document.body.contains(range.commonAncestorContainer) || clean(range.toString()).length < 1) return false;
    state.lastRange = range.cloneRange();
    state.anchor = { kind: "selection", range: state.lastRange.cloneRange() };
    const rect = selectionRect(range);
    if (!rect || !Number.isFinite(rect.left)) return false;
    showTip(rect, "select");
    return true;
  }

  function updateSelection(event) {
    if (/^(Shift|Arrow|Home|End)/.test(event.key)) captureSelection();
  }

  function finishSelection() {
    clearTimeout(state.finishTimer);
    state.finishTimer = setTimeout(() => {
      if (!captureSelection() && !state.lastRange) hideTip();
    }, 0);
  }

  function prepareSelection(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest?.("#pastel-pen,.pastel-pen-mark")) {
      clearTimeout(state.finishTimer);
      return;
    }
    state.lastRange = null;
    state.anchor = null;
    state.expanded = false;
    hideTip();
    document.documentElement.classList.add("pastel-pen-selection-active");
    clearTimeout(state.selectionTimer);
    state.selectionTimer = setTimeout(() => document.documentElement.classList.remove("pastel-pen-selection-active"), 1200);
  }

  function markMenu(event) {
    const mark = event.target.closest?.(".pastel-pen-mark");
    if (!mark) return;
    clearTimeout(state.finishTimer);
    event.stopPropagation();
    state.activeMarkId = mark.dataset.pastelPenId;
    state.deleteButton.dataset.targetId = state.activeMarkId;
    state.lastRange = null;
    state.color = mark.style.getPropertyValue("--pastel-pen-color") || state.color;
    state.anchor = { kind: "mark", mark };
    state.expanded = false;
    renderTip();
    showTip(mark.getBoundingClientRect(), "mark");
  }

  function pickColor(color) {
    if (!validColor(color)) return;
    if (state.tipBody?.dataset.mode === "mark") {
      state.expanded = false;
      renderTip();
      return recolorHighlight(state.activeMarkId, color);
    }
    state.color = color;
    state.expanded = false;
    renderTip();
    repositionTip();
  }

  function renderTip() {
    if (!state.tipBody) return;
    state.tipBody.dataset.expanded = String(state.expanded);
    state.colorButton?.style.setProperty("background", state.color);
    if (state.colorButton) state.colorButton.ariaLabel = `Current colour: ${COLORS.find((x) => x[1] === state.color)?.[0] || "lemon"}. Change colour`;
    state.tipBody.querySelectorAll(".dot").forEach((b) => { b.ariaPressed = String(b.dataset.color === state.color); });
  }

  async function commit(color) {
    if (!state.enabled) return hideTip();
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
    return { removed: true, id };
  }

  async function recolorHighlight(id, color) {
    if (!id || !validColor(color)) return;
    const data = await storage.get();
    const rgb = rgbFor(color);
    const items = data.items.map((item) => item.id === id ? { ...item, color, rgb } : item);
    const prefs = { ...data.prefs, color };
    document.querySelectorAll(`[data-pastel-pen-id="${CSS.escape(id)}"]`).forEach((mark) => {
      mark.style.setProperty("--pastel-pen-color", color);
      mark.style.setProperty("--pastel-pen-rgb", rgb);
      mark.classList.toggle("pastel-pen-mark--dark-surface", darkSurface(mark.parentElement));
      mark.classList.toggle("pastel-pen-mark--light-surface", !darkSurface(mark.parentElement));
    });
    await storage.set({ ...data, items, prefs });
    state.items = items;
    state.color = color;
    renderTip();
    return { recolored: true, id, color };
  }

  async function setScopeEnabled(scope, enabled) {
    const data = await storage.get();
    const prefs = SCOPE.setScope(data.prefs, scope, page(), enabled);
    state.enabled = SCOPE.pageEnabled(prefs, page());
    await storage.set({ ...data, prefs });
    if (state.enabled) activate();
    else deactivate();
    return { enabled: state.enabled, scope, url: page(), key: SCOPE.scopeKey(scope, page()) };
  }

  function serialize(range, color) {
    const text = docText();
    const start = offsetOf(range.startContainer, range.startOffset);
    const exact = fragmentText(range);
    const prefix = text.slice(Math.max(0, start - 80), start);
    const suffix = text.slice(start + exact.length, start + exact.length + 80);
    const rgb = rgbFor(color);
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
      color: validColor(color) ? color : COLORS[0][1],
      rgb,
      createdAt: new Date().toISOString()
    };
  }

  function restoreSoon() {
    requestAnimationFrame(() => restore().catch(console.warn));
  }

  async function restore() {
    if (!state.enabled) return;
    const data = await storage.get();
    state.items = data.items || [];
    const mine = state.items.filter((x) => samePage(x.url) && !document.querySelector(`[data-pastel-pen-id="${CSS.escape(x.id)}"]`));
    for (const item of mine) {
      const range = locate(item);
      if (range) paint(range, item);
    }
  }

  function samePage(url) {
    return SCOPE.cleanPage(url) === page();
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
    if (!state.enabled) return;
    item.color = validColor(item.color) ? item.color : COLORS[0][1];
    item.rgb = item.rgb || rgbFor(item.color);
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
    if (!state.tip) injectTip();
    state.tipBody.dataset.mode = mode === "mark" ? "mark" : "select";
    state.tip.style.display = "block";
    renderTip();
    placeTip(rect);
  }

  function repositionTip() {
    if (!state.tip || state.tip.style.display === "none" || !state.anchor) return;
    const rect = state.anchor.kind === "mark"
      ? state.anchor.mark?.getBoundingClientRect()
      : selectionRect(state.anchor.range);
    if (!rect || (!rect.width && !rect.height)) return hideTip();
    placeTip(rect);
  }

  function placeTip(anchor) {
    const tip = state.tipBody;
    if (!tip) return;
    const pad = 8;
    const gap = 8;
    const { width, height } = tip.getBoundingClientRect();
    const candidates = [
      [anchor.right + gap, anchor.top, "right"],
      [anchor.left - width - gap, anchor.top, "left"],
      [anchor.left, anchor.bottom + gap, "bottom"],
      [anchor.left, anchor.top - height - gap, "top"]
    ];
    const fit = candidates.find(([x, y]) => x >= pad && y >= pad && x + width <= innerWidth - pad && y + height <= innerHeight - pad) || candidates[2];
    const x = Math.max(pad, Math.min(innerWidth - width - pad, fit[0]));
    const y = Math.max(pad, Math.min(innerHeight - height - pad, fit[1]));
    tip.dataset.side = fit[2];
    Object.assign(state.tip.style, { left: `${x}px`, top: `${y}px` });
  }

  function selectionRect(range) {
    if (!range) return null;
    const rects = [...range.getClientRects()].filter((rect) => rect.width || rect.height);
    return rects[rects.length - 1] || range.getBoundingClientRect();
  }

  function unwrap(mark) {
    const parent = mark.parentNode;
    mark.replaceWith(document.createTextNode(mark.textContent));
    parent?.normalize();
  }

  function clearMarks() {
    document.querySelectorAll(".pastel-pen-mark").forEach(unwrap);
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
  function normalize(data = {}) {
    data = data && typeof data === "object" ? data : {};
    const prefs = data && typeof data.prefs === "object" ? data.prefs : {};
    return {
      items: Array.isArray(data.items) ? data.items.map((item) => ({
        ...item,
        color: validColor(item.color) ? item.color : COLORS[0][1],
        rgb: item.rgb || rgbFor(item.color),
        quote: item.quote || clean(item.exact),
        exact: item.exact || item.quote || ""
      })).filter((item) => item.id && item.url && item.exact) : [],
      prefs: {
        ...prefs,
        ...SCOPE.normalizePrefs(prefs)
      }
    };
  }
  function validColor(color) { return COLORS.some((x) => x[1] === color); }
  function rgbFor(color) { return COLORS.find((x) => x[1] === color)?.[2] || COLORS[0][2]; }
  function hideTip() {
    if (state.tip) state.tip.style.display = "none";
    state.activeMarkId = null;
    state.anchor = null;
    state.expanded = false;
  }
  function debounce(fn, wait) { let t; return (...xs) => (clearTimeout(t), t = setTimeout(() => fn(...xs), wait)); }
})();
