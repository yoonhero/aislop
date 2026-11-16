/* Zotero 10 reader adapter. Annotation content and history belong to Zotero. */
var HiBulbReader = class {
  constructor(core, host) {
    this.host = host;
    this.core = core;
    this.doc = document;
    this.win = this.doc.defaultView;
    this.views = new Map();
    this.cards = new Map();
    this.cleanups = [];
    this.known = new Set(this.core._state.annotations.map(a => a.id));
    this.color = '#ffd400';
    this.destroyed = false;
    this.frame = null;
    const original = this.doc.querySelector('.toolbar .highlight');
    if (!original) throw new Error('HiBulb: unsupported Zotero reader toolbar');
    this.style = this.el('style');
    this.style.textContent = host.css;
    this.doc.head.append(this.style);
    this.doc.body.classList.add('hibulb-enabled');
    this.toolbar = this.el('div', 'hibulb-tools');
    this.toolbar.setAttribute('role', 'group');
    this.toolbar.ariaLabel = 'HiBulb annotation tools';
    this.pen = this.button('Highlight text', 'bulb', () => {
      this.core.setTool({ type: this.core._state.tool.type === 'highlight' ? 'pointer' : 'highlight', color: this.color });
    });
    this.note = this.button('Place a note', 'note', () => this.core.setTool({
      type: this.core._state.tool.type === 'note' ? 'pointer' : 'note', color: this.color
    }));
    this.toolbar.append(this.pen, this.note);
    original.before(this.toolbar);
    this.originalUpdate = this.core._updateState;
    const self = this;
    this.patchedUpdate = function (...args) {
      const result = self.originalUpdate.apply(this, args);
      self.schedule();
      return result;
    };
    this.core._updateState = this.patchedUpdate;
    const manager = this.core._annotationManager;
    this.originalRemap = manager.remapHistory;
    this.patchedRemap = function (mapping) {
      for (const [oldID, newID] of mapping) self.host.setLayout(newID, self.host.getLayout(oldID));
      return self.originalRemap.call(this, mapping);
    };
    manager.remapHistory = this.patchedRemap;
    this.listen(this.win, 'resize', () => this.schedule());
    this.listen(this.doc, 'visibilitychange', () => this.schedule());
    this.listen(this.win, 'unload', () => this.destroy());
    this.listen(this.toolbar, 'keydown', event => event.stopPropagation());
    this.schedule();
  }

  el(tag, cls, text) {
    const node = this.doc.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  button(label, icon, action) {
    const b = this.el('button', 'hibulb-button');
    b.type = 'button'; b.title = b.ariaLabel = label;
    const shapes = {
      bulb: 'M9 15v-1a5 5 0 1 1 6 0v1zM9 18h6m-5 3h4M12 1v2M3 10h2m14 0h2',
      note: 'M5 3h14v13l-5 5H5zM14 21v-5h5M8 8h8m-8 4h5',
      color: 'M12 4a8 8 0 1 0 0 16h1a2 2 0 0 0 0-4h-1a2 2 0 0 1 0-4h4a4 4 0 0 0 0-8z',
      delete: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7m4-7v7',
      back: 'm14 6-6 6 6 6',
      fold: 'M5 12h14',
      move: 'M12 3v18M3 12h18m-12-6 3-3 3 3m-6 12 3 3 3-3M6 9l-3 3 3 3m12-6 3 3-3 3',
      check: 'm5 12 4 4L20 5'
    };
    const svg = this.doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
    const path = this.doc.createElementNS(svg.namespaceURI, 'path');
    path.setAttribute('d', shapes[icon]); svg.append(path); b.append(svg);
    b.onclick = event => { event.stopPropagation(); try { action(event); } catch (error) { this.host.error(error); } };
    return b;
  }

  listen(node, name, callback, options) {
    node.addEventListener(name, callback, options);
    this.cleanups.push(() => node.removeEventListener(name, callback, options));
  }

  schedule() {
    if (!this.destroyed && !this.frame) this.frame = this.win.requestAnimationFrame(() => {
      this.frame = null;
      try { this.refresh(); } catch (error) { this.host.error(error); }
    });
  }

  mountView(view, primary) {
    if (!view?._iframeWindow || this.views.has(view)) return;
    const win = view._iframeWindow;
    const layer = this.el('div', 'hibulb-view');
    const rail = this.el('div', 'hibulb-rail');
    rail.ariaLabel = 'Highlights and notes in this document';
    const actions = this.el('div', 'hibulb-actions');
    actions.hidden = true;
    actions.setAttribute('role', 'toolbar');
    actions.ariaLabel = 'Highlight actions';
    layer.append(rail, actions);
    this.doc.body.append(layer);
    const style = win.document.createElement('style');
    // Saved web snapshots can contain a captured browser-extension overlay.
    style.textContent = '#pastel-pen { display:none!important }';
    win.document.head.append(style);
    const session = { view, primary, layer, rail, actions, style, cleanups: [] };
    const update = () => this.schedule();
    const dismiss = () => rail.querySelector('.hibulb-marker-list')?.remove();
    win.addEventListener('pointerdown', dismiss);
    session.cleanups.push(() => win.removeEventListener('pointerdown', dismiss));
    win.addEventListener('scroll', update, true);
    win.addEventListener('resize', update);
    session.cleanups.push(() => win.removeEventListener('scroll', update, true), () => win.removeEventListener('resize', update));
    const observer = new win.ResizeObserver(update);
    observer.observe(win.document.documentElement);
    session.cleanups.push(() => observer.disconnect());
    this.views.set(view, session);
    layer.addEventListener('pointerdown', event => event.stopPropagation());
    layer.addEventListener('keydown', event => {
      event.stopPropagation();
      if (event.key === 'Escape') {
        const list = session.rail.querySelector('.hibulb-marker-list');
        if (list) { list.remove(); return; }
        const card = event.target.closest('.hibulb-card');
        if (card) this.closeNote(card.dataset.id);
        else { this.palette = false; this.core.setSelectedAnnotations([]); this.schedule(); }
      }
    });
  }

  rect(view, annotation) {
    try {
      if (view.getClientRectForPopup && annotation.position.rects) return view.getClientRectForPopup(annotation.position);
      const range = view.toDisplayedRange?.(annotation.position);
      if (!range) return null;
      const r = range.getBoundingClientRect();
      return [r.left, r.top, r.right, r.bottom];
    } catch { return null; }
  }

  openNote(id, navigate = false) {
    this.host.setLayout(id, { open: true });
    this.focusNote = id;
    if (navigate) this.core.navigate({ annotationID: id });
    this.schedule();
  }

  closeNote(id) {
    this.host.setLayout(id, { open: false });
    this.schedule();
  }

  writable(annotation) { return !this.core._state.readOnly && !annotation?.readOnly && !annotation?.isExternal; }

  change(id, values) {
    const current = this.core._state.annotations.find(a => a.id === id);
    if (current && this.writable(current)) this.core._annotationManager.updateAnnotations([{ id, ...values }]);
  }

  add(annotation, withNote) {
    if (this.core._state.readOnly) return;
    const saved = this.core._annotationManager.addAnnotation({ ...annotation, type: 'highlight', color: this.color });
    if (!saved) return;
    this.core.setSelectedAnnotations([saved.id]);
    this.core._updateState({ primaryViewSelectionPopup: null, secondaryViewSelectionPopup: null });
    if (withNote) this.openNote(saved.id);
  }

  renderActions(session) {
    const state = this.core._state;
    const prefix = session.primary ? 'primary' : 'secondary';
    const selection = state[prefix + 'ViewSelectionPopup'];
    const popup = state[prefix + 'ViewAnnotationPopup'];
    const item = popup && state.annotations.find(a => a.id === (popup.annotation?.id || popup.id));
    const supported = selection || item && ['highlight', 'underline', 'note', 'image'].includes(item.type);
    this.doc.body.toggleAttribute('data-hibulb-' + prefix + '-popup', Boolean(supported && item));
    const target = supported && (selection?.annotation || item);
    const rect = selection?.rect || popup?.rect;
    const box = session.actions;
    box.hidden = !target || !rect || state.showAnnotations === false;
    if (box.hidden) { session.actionKey = null; return; }
    const signature = JSON.stringify([target.id, target.position, target.color, this.palette, state.readOnly, target.readOnly]);
    if (session.actionKey !== signature) {
      session.actionKey = signature;
      box.replaceChildren();
      const writable = this.writable(target);
      if (this.palette) {
        const colors = [['Yellow', '#ffd400'], ['Red', '#ff6666'], ['Green', '#5fb236'], ['Blue', '#2ea8e5'], ['Purple', '#a28ae5'], ['Magenta', '#e56eee'], ['Orange', '#f19837'], ['Gray', '#aaaaaa']];
        for (const [label, color] of colors) {
          const b = this.el('button', 'hibulb-swatch');
          b.type = 'button'; b.title = b.ariaLabel = label;
          b.style.setProperty('--swatch', color);
          b.ariaPressed = String((target.id ? target.color : this.color) === color);
          b.disabled = !writable;
          b.onclick = () => { this.color = color; if (['highlight', 'note'].includes(state.tool.type)) this.core.setTool({ color }); if (target.id) this.change(target.id, { color }); this.palette = false; this.schedule(); };
          box.append(b);
        }
        box.append(this.button('Back to highlight actions', 'back', () => { this.palette = false; this.schedule(); }));
      } else {
        if (!target.id) {
          const save = this.button('Highlight', 'check', () => this.add(target, false));
          save.disabled = !writable; box.append(save);
        }
        const color = this.button('Highlight colour', 'color', () => { this.palette = true; this.schedule(); });
        color.disabled = !writable;
        color.style.color = target.color || this.color;
        const note = this.button('Open margin note', 'note', () => target.id ? this.openNote(target.id) : this.add(target, true));
        note.disabled = !target.id && !writable;
        box.append(color, note);
        if (target.id) {
          const remove = this.button('Delete highlight', 'delete', () => {
            this.core._annotationManager.deleteAnnotations([target.id]);
            this.core.setSelectedAnnotations([]);
          });
          remove.disabled = !writable; box.append(remove);
        }
      }
    }
    const width = session.layer.clientWidth;
    const height = session.layer.clientHeight;
    const x = Math.max(6, Math.min(rect[0], width - box.offsetWidth - 20));
    const y = rect[3] + box.offsetHeight + 10 < height ? rect[3] + 6 : rect[1] - box.offsetHeight - 6;
    box.style.left = x + 'px'; box.style.top = Math.max(4, y) + 'px';
  }

  makeCard(session, annotation) {
    const card = this.el('section', 'hibulb-card');
    card.dataset.id = annotation.id; card.ariaLabel = 'Margin note';
    const header = this.el('header', 'hibulb-card-head');
    const grip = this.button('Move note', 'move', () => {});
    const fold = this.button('Collapse note', 'fold', () => this.closeNote(annotation.id));
    header.append(grip, fold);
    const editor = this.el('textarea', 'hibulb-editor');
    editor.ariaLabel = 'Note text'; editor.placeholder = 'Write a note…';
    editor.value = annotation.comment || '';
    const preview = this.el('div', 'hibulb-preview');
    preview.tabIndex = 0; preview.ariaLabel = 'Note preview. Press Enter to edit.';
    const status = this.el('span', 'hibulb-status'); status.role = 'status';
    card.append(header, editor, preview, status);
    session.layer.append(card);
    const entry = { card, editor, preview, annotation, session, status, revision: 0, editing: false, moving: false };
    entry.edit = () => { entry.editing = true; preview.hidden = true; editor.hidden = false; editor.focus({ preventScroll: true }); };
    preview.onclick = event => { if (!event.target.closest('a') && this.win.getSelection().isCollapsed) entry.edit(); };
    preview.onkeydown = event => { if (event.target === preview && event.key === 'Enter') entry.edit(); };
    editor.onfocus = () => { entry.editing = true; };
    editor.oninput = () => {
      // Zotero's annotation manager debounces and serializes writes and owns undo.
      try { this.change(annotation.id, { comment: editor.value }); status.textContent = ''; }
      catch (error) { status.textContent = 'Could not save note'; this.host.error(error); }
    };
    editor.onblur = () => { entry.editing = false; this.preview(entry); };
    const resize = new this.win.ResizeObserver(() => {
      if (!entry.moving && this.doc.activeElement === editor) {
        const h = card.offsetHeight;
        if (h > 100) this.host.setLayout(annotation.id, { height: h });
      }
    });
    resize.observe(card);
    entry.dispose = () => { resize.disconnect(); entry.revision++; card.remove(); };
    let drag;
    grip.onpointerdown = event => {
      if (event.button !== 0) return;
      event.preventDefault(); grip.focus({ preventScroll: true });
      drag = { x: event.clientX, y: event.clientY, left: card.offsetLeft, top: card.offsetTop };
      entry.moving = true; grip.setPointerCapture(event.pointerId);
    };
    grip.onpointermove = event => {
      if (!drag) return;
      card.style.left = Math.max(4, Math.min(session.layer.clientWidth - card.offsetWidth - 18, drag.left + event.clientX - drag.x)) + 'px';
      card.style.top = (drag.top + event.clientY - drag.y) + 'px';
    };
    const persist = () => {
      if (!drag) return;
      drag = null; entry.moving = false;
      const rect = this.rect(session.view, entry.annotation);
      if (rect) this.host.setLayout(annotation.id, {
        x: card.offsetLeft / Math.max(1, session.layer.clientWidth - card.offsetWidth - 18),
        dy: (card.offsetTop - rect[1]) / this.scale(session.view, annotation)
      });
      this.schedule();
    };
    grip.onpointerup = persist;
    grip.onlostpointercapture = persist;
    grip.onkeydown = event => {
      const delta = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -12], ArrowDown: [0, 12] }[event.key];
      if (!delta) return;
      event.preventDefault(); drag = {};
      card.style.left = Math.max(4, Math.min(session.layer.clientWidth - card.offsetWidth - 18, card.offsetLeft + delta[0])) + 'px';
      card.style.top = card.offsetTop + delta[1] + 'px'; persist();
    };
    this.preview(entry);
    return entry;
  }

  async preview(entry) {
    if (entry.editing) return;
    const source = entry.editor.value;
    if (!source) { entry.preview.hidden = true; entry.editor.hidden = false; return; }
    const revision = ++entry.revision;
    try {
      const html = await this.host.render(source);
      if (this.destroyed || revision !== entry.revision || entry.editing || !entry.card.isConnected) return;
      const parsed = new this.win.DOMParser().parseFromString(html, 'text/html');
      entry.preview.replaceChildren(...Array.from(parsed.body.childNodes, node => this.doc.importNode(node, true)));
      entry.editor.hidden = true; entry.preview.hidden = false;
    } catch (error) { this.host.error(error); entry.editor.hidden = false; entry.preview.hidden = true; }
  }

  scale(view, annotation) {
    return view._iframeWindow.PDFViewerApplication?.pdfViewer.getPageView(annotation.position.pageIndex)?.viewport.scale || 1;
  }

  refresh() {
    const state = this.core._state;
    this.pen.ariaPressed = String(state.tool.type === 'highlight');
    this.note.ariaPressed = String(state.tool.type === 'note');
    this.pen.disabled = this.note.disabled = state.readOnly;
    if (state.tool.color) this.color = state.tool.color;
    const liveViews = [this.core._primarySDTView || this.core._primaryView, this.core._secondarySDTView || this.core._secondaryView].filter(Boolean);
    for (const [view, session] of this.views) {
      if (!liveViews.includes(view)) { this.dropView(session); this.views.delete(view); }
    }
    liveViews.forEach((view, i) => this.mountView(view, i === 0));
    for (const a of state.annotations) {
      if (!this.known.has(a.id) && a.type === 'note' && this.writable(a)) this.openNote(a.id);
    }
    this.known = new Set(state.annotations.map(a => a.id));
    for (const session of this.views.values()) this.layout(session, state);
    this.focusNote = null;
  }

  layout(session, state) {
    const { view, layer } = session;
    const frameRect = view._iframe.getBoundingClientRect();
    Object.assign(layer.style, { left: frameRect.left + 'px', top: frameRect.top + 'px', width: frameRect.width + 'px', height: frameRect.height + 'px' });
    layer.hidden = frameRect.width === 0 || frameRect.height === 0 || state.showAnnotations === false;
    if (layer.hidden) return;
    if (!session.suppressed?.node.isConnected) {
      const node = view._iframeWindow.document.getElementById('pastel-pen');
      if (node) {
        session.suppressed = { node, value: node.style.getPropertyValue('display'), priority: node.style.getPropertyPriority('display') };
        node.style.setProperty('display', 'none', 'important');
      }
    }
    const scroller = view._iframeWindow.document.getElementById('viewerContainer') || view._iframeWindow.document.scrollingElement;
    const horizontal = scroller.scrollWidth > scroller.clientWidth + 1 && scroller.scrollHeight <= scroller.clientHeight + 1;
    const total = horizontal ? scroller.scrollWidth : Math.max(scroller.scrollHeight, scroller.clientHeight);
    const annotations = state.annotations.filter(a => !a._hidden);
    const occupied = [];
    const locations = [];
    const cardIDs = new Set();
    for (const a of annotations) {
      const rect = this.rect(view, a);
      if (!rect) continue;
      const outsideX = rect[2] < 0 || rect[0] > frameRect.width;
      const offset = horizontal ? Math.abs(scroller.scrollLeft) + (scroller.scrollLeft < 0 ? frameRect.width - rect[2] : rect[0]) : rect[1] + scroller.scrollTop;
      locations.push({ annotation: a, top: Math.max(0, Math.min(1, offset / total)) * Math.max(0, frameRect.height - 12), inView: !outsideX && rect[3] >= 0 && rect[1] <= frameRect.height });
      const key = (session.primary ? 'p:' : 's:') + a.id;
      const placement = this.host.getLayout(a.id);
      if (!placement.open) continue;
      cardIDs.add(key);
      let entry = this.cards.get(key);
      if (!entry) {
        // Mount nearby cards, keeping focused cards mounted as they scroll offscreen.
        if (outsideX || rect[1] > frameRect.height + 400 || rect[3] < -400) continue;
        entry = this.makeCard(session, a); this.cards.set(key, entry);
      }
      entry.card.hidden = outsideX;
      entry.annotation = a;
      entry.editor.readOnly = !this.writable(a);
      if (!entry.editing && entry.editor.value !== a.comment) { entry.editor.value = a.comment || ''; this.preview(entry); }
      const width = Math.min(300, frameRect.width - 28);
      const height = Math.max(140, Math.min(placement.height || 210, frameRect.height - 16));
      Object.assign(entry.card.style, { width: width + 'px', height: height + 'px', '--annotation-color': a.color });
      if (!entry.moving) {
        let left = placement.x === undefined ? frameRect.width - width - 22 : placement.x * (frameRect.width - width - 18);
        let top = rect[1] + (placement.dy || 0) * this.scale(view, a);
        if (placement.dy === undefined) {
          for (const other of occupied) {
            if (top < other.bottom + 8 && top + height > other.top - 8) top = other.bottom + 8;
          }
        }
        entry.card.style.left = Math.max(4, Math.min(frameRect.width - width - 18, left)) + 'px';
        entry.card.style.top = top + 'px';
        occupied.push({ top, bottom: top + height });
      }
      if (this.focusNote === a.id && session.primary) entry.edit();
    }
    this.renderMarkers(session, locations);
    for (const [key, entry] of this.cards) {
      if (entry.session === session && !cardIDs.has(key)) { entry.dispose(); this.cards.delete(key); }
    }
    this.renderActions(session);
  }

  renderMarkers(session, locations) {
    const groups = [];
    for (const location of locations.sort((a, b) => a.top - b.top)) {
      const last = groups.at(-1);
      if (last && location.top - last[0].top < 9) last.push(location);
      else groups.push([location]);
    }
    const signature = JSON.stringify(groups.map(group => group.map(({ annotation: a, top, inView }) => [a.id, a.text, a.comment, a.color, Math.round(top), inView])));
    if (session.markerSignature === signature) return;
    session.markerSignature = signature;
    session.rail.replaceChildren();
    const label = a => [a.pageLabel && 'Page ' + a.pageLabel, a.text || a.comment || 'Note'].filter(Boolean).join(' · ').slice(0, 180);
    const navigate = id => { this.core.navigate({ annotationID: id }); this.core.setSelectedAnnotations([id]); };
    for (const group of groups) {
      const marker = this.el('button', 'hibulb-marker');
      marker.type = 'button';
      marker.title = marker.ariaLabel = group.length === 1 ? label(group[0].annotation) : group.length + ' annotations in this part of the document';
      marker.style.background = group[0].annotation.color;
      marker.style.top = group[0].top + 'px';
      marker.classList.toggle('in-view', group.some(item => item.inView));
      marker.onclick = () => {
        if (group.length === 1) return navigate(group[0].annotation.id);
        const existing = session.rail.querySelector('.hibulb-marker-list');
        if (existing) { existing.remove(); marker.ariaExpanded = 'false'; return; }
        const list = this.el('div', 'hibulb-marker-list');
        list.setAttribute('role', 'group'); list.ariaLabel = 'Choose annotation';
        list.style.top = Math.min(group[0].top, Math.max(0, session.layer.clientHeight - 180)) + 'px';
        for (const item of group) {
          const b = this.el('button', '', label(item.annotation)); b.type = 'button';
          b.onclick = () => { list.remove(); marker.ariaExpanded = 'false'; navigate(item.annotation.id); };
          list.append(b);
        }
        session.rail.append(list); marker.ariaExpanded = 'true'; list.firstChild.focus();
      };
      session.rail.append(marker);
    }
  }

  dropView(session) {
    for (const [key, entry] of this.cards) {
      if (entry.session === session) { entry.dispose(); this.cards.delete(key); }
    }
    if (session.suppressed) {
      const { node, value, priority } = session.suppressed;
      if (value) node.style.setProperty('display', value, priority);
      else node.style.removeProperty('display');
    }
    session.cleanups.forEach(cleanup => cleanup()); session.style.remove(); session.layer.remove();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.frame) this.win.cancelAnimationFrame(this.frame);
    if (this.core._updateState === this.patchedUpdate) this.core._updateState = this.originalUpdate;
    if (this.core._annotationManager.remapHistory === this.patchedRemap) this.core._annotationManager.remapHistory = this.originalRemap;
    this.cleanups.forEach(cleanup => cleanup());
    for (const session of this.views.values()) this.dropView(session);
    this.views.clear(); this.toolbar.remove(); this.style.remove();
    this.doc.querySelectorAll('.hibulb-sidebar-note').forEach(node => node.remove());
    this.doc.body.removeAttribute('data-hibulb-primary-popup');
    this.doc.body.removeAttribute('data-hibulb-secondary-popup');
    this.doc.body.classList.remove('hibulb-enabled');
    this.host.closed();
  }
};
