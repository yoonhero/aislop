(() => {
  const { key, articleKey, colors, colorIndex, read, element: el } = PastelPen;
  const A = PastelAnchors;
  const S = PastelPenScope;
  const page = () => S.cleanPage(location.href);
  if (!page()) return;
  const write = (action, value, id) => browser.runtime.sendMessage({ type: "pastel-write", action, value, id });
  const shadow = el("div");
  shadow.id = "pastel-pen";
  shadow.style.cssText = "all:initial!important;position:absolute!important;inset:0 0 auto!important;height:0!important;z-index:2147483647!important;pointer-events:none!important";
  const root = shadow.attachShadow({ mode: "open" });
  const css = el("link");
  css.rel = "stylesheet";
  css.href = browser.runtime.getURL("overlay.css");
  css.addEventListener("load", schedule);
  root.append(css);

  function button(label, action, className) {
    const node = el("button", className, label);
    node.type = "button";
    node.onclick = action;
    return node;
  }

  function iconButton(label, path, action, className) {
    const control = button("", action, className);
    control.title = control.ariaLabel = label;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const shape = document.createElementNS(svg.namespaceURI, "path");
    shape.setAttribute("d", path);
    svg.append(shape);
    control.append(svg);
    return control;
  }

  const marks = el("div", "marks");
  marks.ariaHidden = "true";
  const pins = el("div", "pins");
  const scrollUI = PastelScrollbar.create((id) => {
    const entry = geometry.find(({ item }) => item.id === id);
    if (!Number.isFinite(entry?.documentTop)) return;
    setMenu(false);
    dismissSelection();
    scrollTo({ top: entry.documentTop - innerHeight * .35,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  });
  const track = scrollUI.rail;
  const dock = el("div", "dock");
  const penMenu = el("div", "pen-menu");
  penMenu.id = "pen-settings";
  penMenu.hidden = true;
  const toggle = button("Pen off", () => setMenu(penMenu.hidden), "toggle");
  toggle.ariaExpanded = "false";
  toggle.setAttribute("aria-controls", penMenu.id);
  const notebook = button("Notebook", async () => {
    if (data.items.some((item) => item.url === url)) await saveArticle(A.index());
    return browser.runtime.sendMessage({ type: "PASTEL_PEN_OPEN_REVIEW", source: url });
  });
  const penPower = button("Turn pen on", async () => {
    const target = scope;
    await write("scope", { scope: target, url: page(), enabled: !scopeEnabled(), inheritPage: target === "domain" });
    setMenu(false, true);
  }, "pen-power");
  const scopes = el("fieldset", "pen-scopes");
  scopes.append(el("legend", "", "Highlight scope"));
  let scope = "page";
  let scopeInitialized = false;
  const scopeChoices = [["page", "This page"], ["domain", "This domain"]].map(([value, title]) => {
    const label = el("label", "scope-choice");
    const radio = el("input");
    radio.type = "radio";
    radio.name = "pastel-scope";
    radio.value = value;
    radio.checked = value === scope;
    radio.onchange = () => {
      scope = value;
      syncScope();
    };
    label.append(radio, el("span", "", title));
    scopes.append(label);
    return radio;
  });
  const scopeHint = el("p", "scope-hint");
  scopeHint.hidden = true;
  penMenu.append(penPower, scopes, scopeHint);
  dock.append(toggle, notebook, penMenu);
  const tray = el("div", "tray");
  tray.hidden = true;
  tray.setAttribute("role", "group");
  tray.ariaLabel = "Highlight selection";
  tray.addEventListener("mousedown", (event) => event.preventDefault());
  const palette = el("div", "palette");
  palette.id = "pastel-colours";
  palette.hidden = true;
  palette.setAttribute("role", "group");
  palette.ariaLabel = "Highlight colours";
  const paletteToggle = button("", (event) => {
    setPalette(true);
    if (event.detail === 0) swatches[color].focus({ preventScroll: true });
  }, "palette-toggle");
  paletteToggle.setAttribute("aria-controls", palette.id);
  paletteToggle.title = paletteToggle.ariaLabel = "Choose highlight colour";
  paletteToggle.ariaExpanded = "false";
  const swatches = colors.map(([name, color], i) => {
    const b = button("", () => setColor(i), "swatch");
    b.title = name;
    b.ariaLabel = name;
    b.style.setProperty("--swatch", color);
    palette.append(b);
    return b;
  });
  palette.append(iconButton("Back to highlight actions", "m14 6-6 6 6 6",
    () => setPalette(false, true), "palette-back"));
  const save = iconButton("Highlight", "m5 12 4 4 10-10", () => saveSelection(false), "primary");
  const addNote = iconButton("Highlight and add note", "M5 4h14v11l-5 5H5zM14 20v-5h5M8 8h8m-8 4h5", () => {
    if (editing) {
      const { id } = editing;
      dismissSelection();
      showCard(id, true);
    } else saveSelection(true);
  });
  const remove = iconButton("Delete highlight", "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7m4-7v7", () => editHighlight("remove"), "remove");
  remove.hidden = true;
  const saveError = el("span", "save-error");
  saveError.setAttribute("role", "status");
  tray.append(save, paletteToggle, addNote, remove, palette, saveError);

  const stickyCSS = css.cloneNode();
  stickyCSS.href = browser.runtime.getURL("sticky.css");
  const stickyLayer = el("div", "sticky-layer");
  root.append(stickyCSS, marks, pins, stickyLayer, track, dock, tray);
  document.documentElement.append(shadow);

  let data = read();
  let url = page();
  let enabled = false;
  let article;
  let checkedArticle;
  let color = 0;
  let range;
  let editing;
  let dragged = false;
  const notes = new Map();
  let raised = 0;
  let refreshTimer;
  let frame;
  let busy = false;
  let geometry = [];
  let startPointer;
  let touchSelection = false;
  let selectionTimer;

  const observer = new MutationObserver(() => {
    if (!refreshTimer) refreshTimer = setTimeout(() => { refreshTimer = null; refresh(); }, 180);
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["hidden", "class", "style"] });
  const resize = new ResizeObserver(schedule);
  resize.observe(document.body);

  document.fonts.ready.then(schedule);
  addEventListener("resize", schedule);
  addEventListener("scroll", schedule, true);
  addEventListener("popstate", refresh);
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[key]) {
      data = read(changes[key].newValue);
      refresh();
    }
  });
  browser.runtime.onMessage.addListener((message) => {
    if (message.type === "toggle") return write("scope", { scope: "page", url: page(), enabled: !enabled });
    if (message.type === "highlight" && capture()) return commit(false);
  });
  browser.storage.local.get(key).then((result) => {
    data = read(result[key]);
    refresh();
  });

  function setMenu(open, restoreFocus = false) {
    penMenu.hidden = !open;
    toggle.ariaExpanded = String(open);
    if (open) {
      dismissSelection();
      penPower.focus({ preventScroll: true });
    } else if (restoreFocus) toggle.focus({ preventScroll: true });
    schedule();
  }

  function scopeEnabled() {
    return scope === "domain" ? data.prefs.scopeRules.domain[S.domainKey(url)] === true : enabled;
  }

  function syncScope() {
    const on = scopeEnabled();
    toggle.textContent = enabled ? "Pen on" : "Pen off";
    toggle.classList.toggle("is-on", enabled);
    penPower.textContent = on ? "Turn pen off" : "Turn pen on";
    penPower.ariaLabel = penPower.textContent + (scope === "domain" ? " for this domain" : " for this page");
    scopeHint.hidden = scope !== "domain" || on === enabled;
    scopeHint.textContent = scopeHint.hidden ? "" : enabled ? "This page is currently on." : "This page is currently off.";
    for (const radio of scopeChoices) radio.checked = radio.value === scope;
    schedule();
  }

  async function saveArticle(index) {
    const snapshot = A.article(index, article || document.body);
    if (!snapshot.blocks.length) return;
    try {
      await browser.storage.local.set({ [articleKey(url)]: snapshot });
    } catch (error) {
      console.warn("HiBulb could not save the article", error);
    }
  }

  function findArticle() {
    const candidates = [...document.querySelectorAll("main article, article, d-article, [role='main'], main")]
      .filter((node) => node.clientWidth > 200 && node.clientHeight > 120);
    const score = (node) => [...node.querySelectorAll("p")].reduce((total, p) => total + p.textContent.length, 0);
    return candidates.reduce((best, node) => !best || score(node) > score(best) ? node : best, null);
  }

  function syncTheme() {
    const pageStyles = [getComputedStyle(document.body), getComputedStyle(document.documentElement)];
    const explicit = pageStyles.map(({ colorScheme }) => colorScheme).find((scheme) => scheme === "light" || scheme === "dark");
    const surface = pageStyles.map(({ backgroundColor }) => /^rgb\((\d+), (\d+), (\d+)\)$/.exec(backgroundColor)).find(Boolean);
    const brightness = surface && (surface[1] * .2126 + surface[2] * .7152 + surface[3] * .0722);
    shadow.style.colorScheme = explicit || (surface ? (brightness < 128 ? "dark" : "light") : "light dark");
  }

  function refresh() {
    syncTheme();
    const current = page();
    if (current !== url) {
      for (const note of notes.values()) dropNote(note);
      dismissSelection();
      setMenu(false);
      scopeInitialized = false;
      url = current;
    }
    const nextArticle = findArticle();
    if (nextArticle !== article) {
      if (article) resize.unobserve(article);
      article = nextArticle;
      if (article) resize.observe(article);
    }
    const effective = S.resolve(data.prefs, url);
    enabled = effective.enabled;
    if (!scopeInitialized) {
      scope = effective.scope === "domain" ? "domain" : "page";
      scopeInitialized = true;
    }
    if (!enabled) {
      dismissSelection();
    }
    const selectedColor = colorIndex(data.prefs.color);
    if (!range && !editing) color = selectedColor;
    syncScope();
    const saved = data.items.filter((item) => S.cleanPage(item.url) === url);
    if (saved.length && checkedArticle !== url) {
      const source = checkedArticle = url;
      requestIdleCallback(async () => {
        const storageKey = articleKey(source);
        if ((await browser.storage.local.get(storageKey))[storageKey] || url !== source) return;
        await saveArticle(A.index());
      }, { timeout: 2500 });
    }
    const items = enabled ? saved : [];
    const index = items.length ? A.index() : null;
    geometry = items.flatMap((item) => {
      const offset = A.locate(item, index);
      return offset ? [{ item, ...A.geometry(offset, index), pin: null, rects: [] }] : [];
    });
    if (editing && !geometry.some(({ item }) => item.id === editing.id)) dismissSelection();
    for (const [i] of colors.entries()) {
      const ranges = geometry.filter(({ item }) => colorIndex(item.color) === i).flatMap((entry) => entry.ranges);
      if (ranges.length) CSS.highlights.set("pastel-pen-" + i, new Highlight(...ranges));
      else CSS.highlights.delete("pastel-pen-" + i);
    }
    const restorePin = root.activeElement?.dataset.pin;
    pins.replaceChildren();
    for (const entry of geometry) {
      const pin = button(entry.item.note ? "▤" : "+", () => showCard(entry.item.id, false), "pin");
      pin.hidden = true;
      pin.dataset.pin = entry.item.id;
      pin.title = entry.item.note ? "Open margin note" : "Add margin note";
      pin.ariaLabel = pin.title + " for " + (entry.item.quote || entry.item.exact).slice(0, 100);
      pin.style.setProperty("--tint", colors[colorIndex(entry.item.color)][1]);
      pin.ariaExpanded = String(entry.item.folded === false);
      entry.pin = pin;
      pins.append(pin);
      if (entry.item.id === restorePin) pin.focus({ preventScroll: true });
    }
    const unfolded = new Map(geometry.filter(({ item }) => item.folded === false).map(({ item }) => [item.id, item]));
    for (const note of notes.values()) {
      if (!unfolded.has(note.item.id)) dropNote(note);
    }
    for (const item of unfolded.values()) {
      const note = notes.get(item.id);
      if (note) {
        note.item = item;
        note.update(item);
      } else mountNote(item);
    }
    schedule();
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(layout);
  }

  function place(node, x, y) {
    node.style.left = Math.round(x) + "px";
    node.style.top = Math.round(y) + "px";
  }

  function layout() {
    frame = null;
    if (page() !== url) return refresh();
    const width = document.documentElement.clientWidth;
    const height = window.innerHeight;
    const bounds = article?.getBoundingClientRect();
    const scroller = document.scrollingElement;
    const documentHeight = scroller.scrollHeight;
    const scrollLimit = Math.max(0, documentHeight - height);
    const overflowY = getComputedStyle(scroller).overflowY;
    const viewportOverflow = overflowY === "visible" ? getComputedStyle(document.body).overflowY : overflowY;
    // Keep the native scrollbar when the page needs horizontal scrolling.
    const replaceScrollbar = enabled && Boolean(css.sheet) && scrollLimit > 1 &&
      scroller.scrollWidth <= width + 1 &&
      !["hidden", "clip"].includes(viewportOverflow);
    document.documentElement.toggleAttribute("data-pastel-scrollbar", replaceScrollbar);
    marks.replaceChildren();
    const visible = [];
    const marginRight = bounds && width - bounds.right >= 46;
    const marginLeft = bounds && bounds.left >= 46;
    for (const entry of geometry) {
      const equations = entry.formulas.flatMap(A.atomRects);
      const rectangles = [...entry.ranges.flatMap((r) => [...r.getClientRects()]), ...equations].filter((r) => r.width && r.height);
      const anchor = rectangles.reduce((first, rect) => !first || rect.top < first.top ? rect : first, null);
      entry.anchorTop = anchor?.top ?? null;
      entry.documentTop = anchor ? anchor.top + scrollY : null;
      entry.anchorBottom = anchor?.bottom ?? null;
      entry.documentBottom = anchor ? rectangles.reduce((bottom, rect) => Math.max(bottom, rect.bottom), anchor.bottom) + scrollY : null;
      entry.rects = rectangles.filter((r) => r.bottom > 0 && r.top < height && r.right > 0 && r.left < width);
      for (const rect of equations) {
        if (rect.bottom <= 0 || rect.top >= height || !rect.width || !rect.height) continue;
        const mark = el("div", "equation");
        mark.style.cssText = "width:" + rect.width + "px;height:" + rect.height + "px;background:" + colors[colorIndex(entry.item.color)][1];
        place(mark, rect.left, rect.top);
        marks.append(mark);
      }
      const visibleAnchor = entry.rects.reduce((first, rect) => !first || rect.top < first.top ? rect : first, null);
      entry.pin.hidden = !visibleAnchor;
      if (visibleAnchor) visible.push({ entry, anchor: visibleAnchor });
    }
    scrollUI.update(replaceScrollbar, documentHeight, height, geometry);
    const positioned = geometry.filter((entry) => entry.anchorTop !== null && notes.has(entry.item.id))
      .sort((a, b) => Number(Boolean(b.item.placement)) - Number(Boolean(a.item.placement)) || a.anchorTop - b.anchorTop);
    const occupied = [];
    for (const entry of positioned) {
      const note = notes.get(entry.item.id);
      if (note.busy) continue;
      const placement = note.item.placement;
      const rightRoom = bounds ? width - bounds.right - 52 : 0;
      const leftRoom = bounds ? bounds.left - 48 : 0;
      const onRight = rightRoom >= 320;
      const onLeft = !onRight && leftRoom >= 320;
      const w = Math.min(360, onRight ? rightRoom : onLeft ? leftRoom : width - 24);
      const x = onRight ? bounds.right + 44 : onLeft ? bounds.left - w - 40 : width - w - 12;
      const y = onRight || onLeft ? entry.anchorTop : entry.anchorBottom + 8;
      const h = Math.min(244, height - 16);
      let target = placement ? { ...placement, x: placement.x * width, y: entry.anchorTop + placement.y } : { x, y, w, h };
      if (!placement) {
        const columns = [x, 12, width - w - 12].map((left) => new DOMRect(left, y, w, h));
        const clear = columns.find((candidate) => !occupied.some((other) => overlap(candidate, other)));
        if (clear) target = { x: clear.x, y, w, h };
        else {
          const candidate = columns[0];
          for (const other of [...occupied].sort((a, b) => a.top - b.top)) {
            if (overlap(candidate, other)) candidate.y = other.bottom + 6;
          }
          target = { x, y: candidate.y, w, h };
        }
      }
      const placed = placeNote(note, target, false);
      occupied.push(new DOMRect(placed.x, placed.y, placed.w, placed.h));
    }
    const openNotes = [...notes.values()].filter(({ card }) => {
      const rect = card.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < height;
    });
    const controls = [dock.getBoundingClientRect(), ...openNotes.map(({ card }) => card.querySelector(".sticky-head").getBoundingClientRect())];
    if (!track.hidden) controls.push(track.getBoundingClientRect());
    if (range || editing) {
      const rects = range ? [...range.getClientRects()] : geometry.find(({ item }) => item.id === editing.id)?.rects || [];
      const onscreen = rects.filter((rect) => rect.width && rect.height && rect.bottom > 0 && rect.top < height);
      const rect = editing ? onscreen.find((rect) => containsPoint(rect, editing.x, editing.y)) || onscreen[0] : onscreen.at(-1);
      tray.hidden = !rect;
      if (rect) {
        const w = tray.offsetWidth;
        const h = tray.offsetHeight;
        const edge = track.hidden ? 8 : 30;
        const x = Math.max(8, Math.min(rect.left, width - w - edge));
        const above = rect.top - h - 8;
        const below = rect.bottom + 8;
        const rows = [below, above];
        const spots = rows.flatMap((top) => [x, rect.right + 8, rect.left - w - 8].map((left) => new DOMRect(left, top, w, h)));
        const spot = spots.find((candidate) => candidate.left >= 8 && candidate.right <= width - 8 &&
          candidate.top >= 8 && candidate.bottom <= height - 8 && !controls.some((other) => overlap(candidate, other)));
        const left = spot?.x ?? x;
        const top = spot?.y ?? Math.max(8, Math.min(rows[0], height - h - 8));
        place(tray, left, top);
      }
    }

    const obstacles = [controls[0], ...openNotes.map(({ card }) => card.getBoundingClientRect())];
    if (!tray.hidden) obstacles.push(tray.getBoundingClientRect());
    if (!track.hidden) obstacles.push(track.getBoundingClientRect());
    if (!penMenu.hidden) obstacles.push(penMenu.getBoundingClientRect());
    visible.sort((a, b) => a.anchor.top - b.anchor.top);
    const rail = marginRight ? Math.min(bounds.right + 10, width - 54) : marginLeft ? bounds.left - 30 : width - 54;
    for (const { entry, anchor } of visible) {
      const w = entry.pin.offsetWidth;
      const h = entry.pin.offsetHeight;
      let spot;
      for (const x of [Math.max(8, rail), rail > width / 2 ? 8 : width - w - 8]) {
        const candidate = new DOMRect(x, Math.max(8, anchor.top), w, h);
        for (const other of [...obstacles].sort((a, b) => a.top - b.top)) {
          if (overlap(candidate, other)) candidate.y = other.bottom + 5;
        }
        if (candidate.bottom <= height - 8) {
          spot = candidate;
          break;
        }
      }
      entry.pin.hidden = !spot;
      if (spot) {
        place(entry.pin, spot.x, spot.y);
        obstacles.push(spot);
      }
    }
  }

  function overlap(a, b) {
    return a.left < b.right + 4 && a.right + 4 > b.left && a.top < b.bottom + 4 && a.bottom + 4 > b.top;
  }

  function setPalette(open, restoreFocus = false) {
    palette.hidden = !open;
    paletteToggle.ariaExpanded = String(open);
    if (restoreFocus) paletteToggle.focus({ preventScroll: true });
    schedule();
  }

  function dismissSelection() {
    range = null;
    editing = null;
    save.hidden = false;
    remove.hidden = true;
    addNote.title = addNote.ariaLabel = "Highlight and add note";
    tray.hidden = true;
    if (!palette.hidden) setPalette(false);
  }

  function capture(points = []) {
    if (!enabled) return false;
    const selection = getSelection();
    const endpoints = points.map(({ target }) => target);
    const selected = selection?.rangeCount && !selection.isCollapsed ? selection.getRangeAt(0) : null;
    if (selected && document.body.contains(selected.commonAncestorContainer)) {
      if (selected.startContainer.parentElement?.closest("input,textarea,[contenteditable=true]")) return false;
      range = selected.cloneRange();
      A.extendToAtoms(range, [selected.startContainer, selected.endContainer, ...endpoints]);
    } else if (points.length === 2) {
      const carets = points.map(({ x, y, target }) => {
        const atom = A.atomAt(target);
        const caret = document.caretPositionFromPoint(x, y);
        if (atom) {
          const boundary = document.createRange();
          boundary.selectNode(atom);
          return { node: boundary.startContainer, offset: boundary.startOffset };
        }
        return caret && { node: caret.offsetNode, offset: caret.offset };
      });
      if (carets.some((caret) => !caret || !document.body.contains(caret.node))) return false;
      const [first, last] = carets;
      range = document.createRange();
      range.setStart(first.node, first.offset);
      range.collapse(true);
      if (range.comparePoint(last.node, last.offset) < 0) range.setStart(last.node, last.offset);
      else range.setEnd(last.node, last.offset);
      A.extendToAtoms(range, endpoints);
      if (range.collapsed) return false;
    } else return false;
    editing = null;
    save.hidden = false;
    remove.hidden = true;
    addNote.title = addNote.ariaLabel = "Highlight and add note";
    saveError.textContent = "";
    syncPalette();
    schedule();
    return true;
  }

  addEventListener("pointerdown", (event) => {
    if (!penMenu.hidden && !event.composedPath().includes(dock)) setMenu(false);
    if (!event.composedPath().includes(track)) scrollUI.close();
    if (!enabled || event.composedPath().includes(shadow) || event.button !== 0 ||
        event.target.closest?.("input,textarea,[contenteditable=true]")) return;
    clearTimeout(selectionTimer);
    dismissSelection();
    dragged = false;
    touchSelection = event.pointerType === "touch";
    startPointer = { x: event.clientX, y: event.clientY, target: event.target };
  }, true);
  addEventListener("pointerup", (event) => {
    if (!startPointer || event.button !== 0) return;
    const start = startPointer;
    startPointer = null;
    clearTimeout(selectionTimer);
    if (event.composedPath().includes(shadow)) return;
    const moved = dragged = Math.hypot(start.x - event.clientX, start.y - event.clientY) >= 4;
    const end = { x: event.clientX, y: event.clientY, target: document.elementFromPoint(event.clientX, event.clientY) };
    selectionTimer = setTimeout(() => capture(moved ? [start, end] : []), 0);
  }, true);
  addEventListener("pointercancel", () => { startPointer = null; });
  document.addEventListener("selectionchange", () => {
    if (!enabled || root.activeElement) return;
    if (touchSelection && !getSelection()?.isCollapsed) {
      clearTimeout(selectionTimer);
      selectionTimer = setTimeout(() => capture(), 180);
    }
  });
  addEventListener("keyup", (event) => {
    if (event.target !== shadow && /^(Shift|Arrow|Home|End)/.test(event.key)) capture();
  });
  addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (scrollUI.close(true)) return;
    if (!palette.hidden) {
      setPalette(false, true);
      return;
    }
    if (!penMenu.hidden) {
      setMenu(false, true);
      return;
    }
    const note = [...notes.values()].find(({ card }) => card.contains(root.activeElement));
    if (note) foldNote(note);
    else dismissSelection();
  });
  function containsPoint(rect, x, y) {
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  addEventListener("click", (event) => {
    if (!enabled || dragged || event.detail === 0 || event.composedPath().includes(shadow) ||
        !getSelection()?.isCollapsed || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey ||
        event.target.closest?.("button,input,textarea,select,summary,[contenteditable]")) return;
    const { clientX: x, clientY: y } = event;
    const entry = geometry.find(({ rects }) => rects.some((rect) => containsPoint(rect, x, y)));
    if (!entry) return;
    clearTimeout(selectionTimer);
    event.preventDefault();
    range = null;
    editing = { id: entry.item.id, x, y };
    color = colorIndex(entry.item.color);
    save.hidden = true;
    remove.hidden = false;
    addNote.title = addNote.ariaLabel = entry.item.note ? "Open sticky note" : "Add sticky note";
    saveError.textContent = "";
    syncPalette();
    schedule();
  }, true);

  async function editHighlight(action, value) {
    if (!editing || busy) return;
    const { id } = editing;
    const item = data.items.find((entry) => entry.id === id);
    if (action === "remove") {
      await notes.get(id)?.flush();
      const note = notes.get(id)?.editor.value ?? item?.note;
      if (typeof note === "string" && note.trim() && !confirm("Delete this highlight and its attached note?")) return;
    }
    busy = true;
    try {
      data = read(await write(action, value, id));
      if (action === "remove") dismissSelection();
      refresh();
    } catch (error) {
      console.warn(error);
      saveError.textContent = "Could not update highlight.";
    } finally {
      busy = false;
    }
  }

  function syncPalette() {
    paletteToggle.style.setProperty("--current", colors[color][1]);
    swatches.forEach((swatch, i) => { swatch.ariaPressed = String(i === color); });
  }

  function setColor(i) {
    color = i;
    setPalette(false, palette.contains(root.activeElement));
    syncPalette();
    if (editing) editHighlight("color", colors[i][1]);
  }

  function saveSelection(withNote) {
    commit(withNote).catch((error) => {
      console.warn(error);
      saveError.textContent = "Could not save.";
    });
  }

  async function commit(withNote) {
    if (!range || !enabled || busy) return;
    const currentIndex = A.index();
    const offsets = A.selected(range, currentIndex);
    if (!offsets) return dismissSelection();
    const { start, end } = offsets;
    const { text } = currentIndex;
    const exact = text.slice(start, end);
    if (!A.clean(exact)) return dismissSelection();
    const item = {
      ...offsets, id: Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join(""), url, title: document.title, exact,
      quote: A.clean(exact.replaceAll("\ufffc", "")),
      prefix: text.slice(Math.max(0, start - 80), start), suffix: text.slice(end, end + 80),
      context: A.context(currentIndex, offsets),
      color: colors[color][1], paper: colors[color][1], note: "", folded: !withNote, createdAt: new Date().toISOString()
    };
    busy = true;
    try {
      data = read(await write("add", item));
      if (!data.items.some((entry) => entry.id === item.id)) throw new Error("Highlight was not stored");
      await saveArticle(currentIndex);
      getSelection()?.removeAllRanges();
      dismissSelection();
      refresh();
      if (withNote) await showCard(item.id, true);
    } finally {
      busy = false;
    }
  }

  async function showCard(id, focus) {
    const item = data.items.find((entry) => entry.id === id);
    if (!item || !enabled) return;
    if (item.folded !== false) {
      data = read(await write("fold", false, id));
      refresh();
    }
    const note = notes.get(id);
    if (!note) return;
    note.card.style.zIndex = ++raised;
    if (focus) note.edit();
  }

  function mountNote(item) {
    const id = item.id;
    const note = PastelSticky.create({
      item,
      save: (action, value) => write(action, value, id),
      collapse: () => foldNote(note),
      layout: (rect, dx, dy, persist) => {
        if (!rect) return schedule();
        const next = placeNote(note, { x: rect.x + dx, y: rect.y + dy, w: rect.width, h: rect.height });
        schedule();
        if (!persist) return;
        const top = geometry.find((entry) => entry.item.id === id)?.anchorTop;
        const placement = { ...next, x: next.x / document.documentElement.clientWidth, y: next.y - (Number.isFinite(top) ? top : 20) };
        note.item = { ...note.item, placement };
        write("placement", placement, id);
      }
    });
    note.item = item;
    note.card.dataset.noteId = id;
    note.card.style.zIndex = ++raised;
    note.card.addEventListener("pointerdown", () => { note.card.style.zIndex = ++raised; });
    notes.set(id, note);
    stickyLayer.append(note.card);
  }

  function placeNote(note, rect, keepInView = true) {
    const next = PastelSticky.constrain(rect, document.documentElement.clientWidth, innerHeight);
    if (!keepInView) next.y = rect.y;
    // Convert the viewport geometry to the layer's document coordinates.
    const origin = stickyLayer.getBoundingClientRect();
    PastelSticky.place(note.card, { ...next, x: next.x - origin.left, y: next.y - origin.top });
    return next;
  }

  function dropNote(note) {
    note.flush();
    note.dispose();
    note.card.remove();
    notes.delete(note.item.id);
  }

  async function foldNote(note) {
    const id = note.item.id;
    geometry.find((entry) => entry.item.id === id)?.pin.focus({ preventScroll: true });
    await note.flush();
    await write("fold", true, id);
  }

  addEventListener("pagehide", () => {
    for (const note of notes.values()) note.flush();
  });
})();
