/* Zotero 10 reader adapter. Annotation content and history belong to Zotero. */
var HiBulbReader = class {
  constructor(core, host) {
    this.host = host;
    this.core = core;
    this.doc = document;
    this.win = this.doc.defaultView;
    this.views = new Map();
    this.cards = new Map();
    this.noteUI = new Map();
    this.cleanups = [];
    this.annotations = this.core._state.annotations;
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
    this.note = this.button('Place one note', 'note', () => {
      this.placing = this.core._state.tool.type !== 'note';
      this.core.setTool({ type: this.placing ? 'note' : 'pointer', color: this.color });
    });
    if (this.core._state.tool.type === 'note') this.core.setTool({ type: 'pointer' });
    this.toolbar.append(this.pen, this.note);
    original.before(this.toolbar);
    this.originalUpdate = this.core._updateState;
    const self = this;
    this.patchedUpdate = function (...args) {
      const result = self.originalUpdate.apply(this, args);
      const changes = args[0] || {};
      if (Object.keys(changes).some(key => /^(tool|annotations|readOnly|showAnnotations|selectedAnnotationIDs|splitType|splitSize|primaryViewSelectionPopup|secondaryViewSelectionPopup|primaryViewAnnotationPopup|secondaryViewAnnotationPopup)$/.test(key))) self.schedule();
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
      move: 'M8 10h8M8 14h8',
      resize: 'M8 20 20 8M14 20l6-6',
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
    // Keep focus in the document until the action fires. Otherwise the native
    // reader dismisses its selection and removes these buttons before click.
    actions.addEventListener('pointerdown', event => event.preventDefault());
    actions.addEventListener('mousedown', event => event.preventDefault());
    layer.append(rail, actions);
    this.doc.body.append(layer);
    const style = win.document.createElement('style');
    // Saved web snapshots can contain a captured browser-extension overlay.
    style.textContent = '#pastel-pen { display:none!important }';
    win.document.head.append(style);
    const session = { view, primary, layer, rail, actions, style, cleanups: [] };
    const paperHost = win.document.createElement('div');
    paperHost.className = 'hibulb-paper';
    paperHost.style.cssText = 'all:initial!important;position:absolute!important;left:0!important;top:0!important;width:100%!important;height:0!important;overflow:visible!important;pointer-events:none!important;z-index:100!important;zoom:1!important;display:var(--notes-display,block)!important';
    const viewer = win.document.getElementById('viewer');
    const parent = viewer || win.document.body;
    if (viewer && win.getComputedStyle(viewer).position === 'static') {
      const value = viewer.style.getPropertyValue('position'), priority = viewer.style.getPropertyPriority('position');
      viewer.style.setProperty('position', 'relative');
      session.cleanups.push(() => value ? viewer.style.setProperty('position', value, priority) : viewer.style.removeProperty('position'));
    }
    parent.append(paperHost); session.paperHost = paperHost;
    const update = () => { dismiss(); this.schedule(); };
    const dismiss = () => {
      rail.querySelector('.hibulb-marker-list')?.remove();
      rail.querySelectorAll('[aria-expanded=true]').forEach(marker => marker.ariaExpanded = 'false');
    };
    win.addEventListener('pointerdown', dismiss);
    session.cleanups.push(() => win.removeEventListener('pointerdown', dismiss));
    win.addEventListener('scroll', update, true);
    win.addEventListener('resize', update);
    session.cleanups.push(() => win.removeEventListener('scroll', update, true), () => win.removeEventListener('resize', update));
    // Layout changes are delivered before paint. Scrolling itself is handled
    // by the native document, not by moving a fixed overlay in a later frame.
    session.pageRects = new WeakMap();
    const geometryUpdate = () => {
      session.pageRects = new WeakMap();
      if (this.destroyed || !this.views.has(view)) return;
      try { this.layout(session, this.core._state); } catch (error) { this.host.error(error); }
    };
    const pdf = win.PDFViewerApplication;
    if (pdf) {
      // PDF.js has already resized every page when this fires. Update the
      // anchor in the same zoom operation as the paper's inherited scale.
      const viewer = pdf.pdfViewer;
      const updateScale = viewer.updateScale;
      function zoom(options) {
        // PDF.js normally updates its location on the next scroll frame. A pinch
        // or toolbar zoom can arrive first, while _location still names a distant page.
        this.update();
        const box = this.container.getBoundingClientRect();
        return updateScale.call(this, { ...options, origin: options.origin || [box.x + box.width / 2, box.y + box.height / 2] });
      }
      viewer.updateScale = zoom;
      session.cleanups.push(() => { if (viewer.updateScale === zoom) viewer.updateScale = updateScale; });
      pdf.eventBus._on('scalechanging', geometryUpdate);
      session.cleanups.push(() => pdf.eventBus._off('scalechanging', geometryUpdate));
    }
    const observer = new win.ResizeObserver(geometryUpdate);
    observer.observe(win.document.documentElement);
    observer.observe(parent);
    session.cleanups.push(() => observer.disconnect());
    const themeObserver = new win.MutationObserver(geometryUpdate);
    themeObserver.observe(win.document.documentElement, { attributes: true, attributeFilter: ['style', 'data-color-scheme'] });
    session.cleanups.push(() => themeObserver.disconnect());
    this.views.set(view, session);
    layer.addEventListener('pointerdown', event => event.stopPropagation());
    layer.addEventListener('keydown', event => {
      event.stopPropagation();
      if (event.key === 'Escape') {
        const list = session.rail.querySelector('.hibulb-marker-list');
        if (list) {
          session.rail.querySelector('[aria-expanded=true]')?.focus({ preventScroll: true });
          dismiss(); return;
        }
        this.palette = false; this.core.setSelectedAnnotations([]); this.schedule();
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
    const w = box.offsetWidth;
    const h = box.offsetHeight;
    const x = Math.max(6, Math.min(rect[0], width - w - 22));
    const cards = [...this.cards.values()].filter(entry => entry.session === session)
      .map(entry => {
        const card = entry.shell.getBoundingClientRect();
        return new DOMRect(card.left, card.top, card.width, card.height);
      });
    const candidates = [rect[3] + 6, rect[1] - h - 6].flatMap(top =>
      [x, rect[2] + 6, rect[0] - w - 6].map(left => new DOMRect(left, top, w, h)));
    const spot = candidates.find(candidate => candidate.left >= 6 && candidate.right <= width - 18
      && candidate.top >= 4 && candidate.bottom <= height - 4
      && cards.every(card => candidate.right + 4 <= card.left || candidate.left >= card.right + 4
        || candidate.bottom + 4 <= card.top || candidate.top >= card.bottom + 4));
    box.style.left = (spot?.x ?? x) + 'px';
    box.style.top = (spot?.y ?? Math.max(4, Math.min(rect[1] - h - 6, height - h - 4))) + 'px';
  }

  makeCard(session, annotation) {
    const key = (session.primary ? 'p:' : 's:') + annotation.id;
    const saved = this.noteUI.get(key);
    const inner = session.view._iframeWindow.document;
    const shell = inner.createElement('div');
    shell.className = 'hibulb-paper-note'; shell.dataset.id = annotation.id;
    shell.style.cssText = 'all:initial!important;position:absolute!important;display:block!important;left:var(--note-left,0px)!important;top:var(--note-top,0px)!important;width:300px!important;height:210px!important;transform:var(--note-transform)!important;transform-origin:0 0!important;pointer-events:none!important;z-index:var(--note-z,1)!important';
    const frame = inner.createElement('iframe');
    frame.title = 'HiBulb margin note';
    frame.style.cssText = 'all:initial!important;display:block!important;width:100%!important;height:100%!important;border:0!important;border-radius:2px!important;box-shadow:0 2px 5px #0002!important;pointer-events:auto!important;background:transparent!important';
    shell.append(frame); session.paperHost.append(shell);
    // A small document keeps the page's CSS and native annotation capture
    // handlers out of the note. Its frame remains inside the native scroller.
    const noteDoc = frame.contentDocument;
    noteDoc.open(); noteDoc.write('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>'); noteDoc.close();
    const css = noteDoc.createElement('style'); css.textContent = this.host.noteCSS; noteDoc.head.append(css);
    const card = this.el('section', 'hibulb-card');
    card.dataset.id = annotation.id; card.ariaLabel = 'Margin note';
    const header = this.el('header', 'hibulb-card-head');
    const grip = this.button('Move note', 'move', () => {});
    const fold = this.button('Collapse note', 'fold', () => this.closeNote(annotation.id));
    const remove = this.button('Delete note', 'delete', () => {
      if (!this.writable(annotation)) return;
      if (annotation.type === 'note') this.core._annotationManager.deleteAnnotations([annotation.id]);
      else this.change(annotation.id, { comment: '' });
      this.closeNote(annotation.id);
    });
    header.append(grip, remove, fold);
    const editor = this.el('textarea', 'hibulb-editor');
    editor.ariaLabel = 'Note text'; editor.placeholder = 'Write a note…';
    editor.value = annotation.comment || '';
    editor.setSelectionRange(saved?.start || 0, saved?.end || 0, saved?.direction);
    const preview = this.el('div', 'hibulb-preview');
    preview.hidden = true;
    preview.tabIndex = 0; preview.ariaLabel = 'Note preview. Press Enter to edit.';
    const status = this.el('span', 'hibulb-status'); status.role = 'status';
    const footer = this.el('footer', 'hibulb-card-foot');
    card.append(header, editor, preview, status, footer);
    noteDoc.body.append(card);
    const entry = { card, shell, frame, remove, noteDoc, editor, preview, annotation, session, status, restoreScroll: saved?.scroll, revision: 0, editing: false, moving: false, resizing: false };
    noteDoc.addEventListener('focusin', () => shell.style.setProperty('--note-z', '2'));
    noteDoc.addEventListener('focusout', () => shell.style.setProperty('--note-z', '1'));
    noteDoc.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); this.closeNote(annotation.id); }
    });
    noteDoc.addEventListener('wheel', event => {
      if (!event.ctrlKey && !event.metaKey) return;
      // Trackpad pinch over the paper belongs to the document's zoom handler.
      event.preventDefault();
      const win = session.view._iframeWindow, bounds = frame.getBoundingClientRect();
      const zoom = bounds.width / frame.clientWidth;
      const target = win.document.getElementById('viewerContainer') || win.document.body;
      target.dispatchEvent(new win.WheelEvent('wheel', {
        bubbles: true, cancelable: true, ctrlKey: event.ctrlKey,
        clientX: bounds.left + event.clientX * zoom, clientY: bounds.top + event.clientY * zoom,
        deltaX: event.deltaX, deltaY: event.deltaY, deltaZ: event.deltaZ, deltaMode: event.deltaMode,
        shiftKey: event.shiftKey, altKey: event.altKey, metaKey: event.metaKey
      }));
    }, { passive: false });
    entry.edit = point => {
      const scrollTop = entry.restoreScroll ?? preview.scrollTop;
      entry.restoreScroll = undefined;
      entry.editing = true; preview.hidden = true; editor.hidden = false;
      editor.focus({ preventScroll: true });
      editor.scrollTop = scrollTop;
      if (point) {
        // Hit-test the actual textarea after layout. Gecko accounts for soft
        // wrapping, document zoom, internal scrolling, and Unicode text.
        const caret = noteDoc.caretPositionFromPoint(point.x, point.y);
        if (caret?.offsetNode === editor) editor.setSelectionRange(caret.offset, caret.offset);
        editor.scrollTop = scrollTop;
      }
    };
    preview.onclick = event => {
      const link = event.target.closest('a');
      if (link) { event.preventDefault(); this.host.openLink(link.href); return; }
      if (noteDoc.defaultView.getSelection().isCollapsed) {
        entry.edit(event.detail ? { x: event.clientX, y: event.clientY } : null);
      }
    };
    preview.onkeydown = event => {
      if (event.target === preview && event.key === 'Enter') { event.preventDefault(); entry.edit(); }
    };
    editor.onfocus = () => { entry.editing = true; };
    editor.oninput = () => {
      // Zotero's annotation manager debounces and serializes writes and owns undo.
      try { this.change(annotation.id, { comment: editor.value }); status.textContent = ''; }
      catch (error) { status.textContent = 'Could not save note'; this.host.error(error); }
    };
    editor.onblur = () => { entry.editing = false; this.preview(entry); };
    entry.dispose = () => {
      this.noteUI.set(key, { start: editor.selectionStart, end: editor.selectionEnd, direction: editor.selectionDirection, scroll: preview.hidden ? editor.scrollTop : preview.scrollTop });
      entry.revision++; shell.remove();
    };
    let drag;
    grip.onpointerdown = event => {
      if (event.button !== 0) return;
      event.preventDefault(); grip.focus({ preventScroll: true });
      const bounds = shell.getBoundingClientRect();
      drag = { x: event.screenX, y: event.screenY, left: bounds.left, top: bounds.top };
      entry.moving = true; grip.setPointerCapture(event.pointerId);
    };
    grip.onpointermove = event => {
      if (!drag) return;
      const paper = this.paper(session.view, entry.annotation);
      const width = shell.getBoundingClientRect().width;
      const host = session.paperHost.getBoundingClientRect();
      shell.style.setProperty('--note-left', Math.max(paper.left, Math.min(paper.left + paper.width - width, drag.left + event.screenX - drag.x)) - host.left + 'px');
      shell.style.setProperty('--note-top', drag.top + event.screenY - drag.y - host.top + 'px');
    };
    const persist = () => {
      if (!drag) return;
      drag = null; entry.moving = false;
      const rect = this.rect(session.view, entry.annotation);
      if (rect) {
        const paper = this.paper(session.view, entry.annotation);
        const bounds = shell.getBoundingClientRect();
        this.host.setLayout(annotation.id, {
          x: (bounds.left - paper.left) / Math.max(1, paper.width - bounds.width),
          dy: (bounds.top - rect[1]) / paper.units
        });
      }
      this.schedule();
    };
    grip.onpointerup = persist;
    grip.onlostpointercapture = persist;
    grip.onkeydown = event => {
      const delta = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -12], ArrowDown: [0, 12] }[event.key];
      if (!delta) return;
      event.preventDefault(); drag = {};
      const paper = this.paper(session.view, entry.annotation);
      const bounds = shell.getBoundingClientRect(), host = session.paperHost.getBoundingClientRect();
      shell.style.setProperty('--note-left', Math.max(paper.left, Math.min(paper.left + paper.width - bounds.width, bounds.left + delta[0] * paper.zoom)) - host.left + 'px');
      shell.style.setProperty('--note-top', bounds.top + delta[1] * paper.zoom - host.top + 'px'); persist();
    };
    for (const side of ['left', 'right']) {
      const handle = this.button('Scale note from ' + side + ' corner (arrow keys)', 'resize', () => {});
      handle.classList.add('hibulb-resize', 'hibulb-resize-' + side);
      footer.append(handle);
      let start;
      const begin = () => {
        const paper = this.paper(session.view, entry.annotation), bounds = shell.getBoundingClientRect();
        entry.resizing = true;
        start = {
          left: (bounds.left - paper.left) / paper.zoom,
          width: shell.offsetWidth, height: shell.offsetHeight,
          scale: bounds.width / (shell.offsetWidth * paper.zoom)
        };
      };
      const resize = (dx, dy) => {
        const paper = this.paper(session.view, entry.annotation);
        const available = side === 'left' ? start.left + start.width * start.scale : paper.width / paper.zoom - start.left;
        const maxScale = available / start.width;
        // Project the pointer onto the paper's diagonal. The entire iframe
        // scales uniformly, so text wrapping, math and the editor stay intact.
        const delta = ((side === 'left' ? -dx : dx) * start.width + dy * start.height)
          / (start.width ** 2 + start.height ** 2);
        const scale = Math.min(maxScale, Math.max(Math.min(.6, maxScale), start.scale + delta));
        const left = start.left + (side === 'left' ? start.width * (start.scale - scale) : 0);
        shell.style.setProperty('--note-scale', scale);
        shell.style.setProperty('--note-left', paper.left + left * paper.zoom - session.paperHost.getBoundingClientRect().left + 'px');
      };
      const finish = () => {
        if (!start) return;
        start = null; entry.resizing = false;
        const paper = this.paper(session.view, entry.annotation), bounds = shell.getBoundingClientRect();
        this.host.setLayout(annotation.id, {
          scale: bounds.width / (shell.offsetWidth * paper.zoom),
          x: (bounds.left - paper.left) / Math.max(1, paper.width - bounds.width)
        });
        this.schedule();
      };
      handle.onpointerdown = event => {
        if (event.button !== 0) return;
        event.preventDefault(); handle.focus({ preventScroll: true }); begin();
        start.x = event.screenX; start.y = event.screenY;
        handle.setPointerCapture(event.pointerId);
      };
      handle.onpointermove = event => {
        if (!start) return;
        const zoom = this.paper(session.view, entry.annotation).zoom;
        resize((event.screenX - start.x) / zoom, (event.screenY - start.y) / zoom);
      };
      handle.onpointerup = finish;
      handle.onlostpointercapture = finish;
      handle.onkeydown = event => {
        const delta = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -12], ArrowDown: [0, 12] }[event.key];
        if (!delta) return;
        event.preventDefault(); begin(); resize(...delta); finish();
      };
    }
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
      const scrollTop = entry.restoreScroll ?? (entry.preview.hidden ? entry.editor.scrollTop : entry.preview.scrollTop);
      entry.preview.replaceChildren(...Array.from(parsed.body.childNodes, node => entry.noteDoc.importNode(node, true)));
      entry.editor.hidden = true; entry.preview.hidden = false;
      entry.preview.scrollTop = scrollTop;
      entry.restoreScroll = undefined;
    } catch (error) { this.host.error(error); entry.editor.hidden = false; entry.preview.hidden = true; }
  }

  paper(view, annotation) {
    const position = annotation.position;
    const page = view._iframeWindow.PDFViewerApplication?.pdfViewer.getPageView(position.pageIndex + (position.nextPageRects ? 1 : 0));
    if (page) {
      const rect = page.div.getBoundingClientRect();
      // PDF points use 72 units/inch, while the reader renders 96 CSS px/inch.
      return { left: rect.left, width: page.viewport.width, units: page.viewport.scale, zoom: page.viewport.scale * 72 / 96 };
    }
    const rect = view._iframeWindow.document.body.getBoundingClientRect();
    return { left: rect.left, width: rect.width, units: view.scale, zoom: view.scale };
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
    if (this.placing && this.annotations !== state.annotations) {
      const ids = new Set(this.annotations.map(a => a.id));
      const placed = state.annotations.find(a => a.type === 'note' && !ids.has(a.id) && this.writable(a));
      if (placed) {
        this.placing = false;
        if (state.tool.type === 'note') this.core.setTool({ type: 'pointer' });
        this.openNote(placed.id);
      }
    }
    this.annotations = state.annotations;
    if (state.tool.type !== 'note') this.placing = false;
    for (const session of this.views.values()) this.layout(session, state);
    this.focusNote = null;
  }

  layout(session, state) {
    const { view, layer } = session;
    const frameRect = view._iframe.getBoundingClientRect();
    Object.assign(layer.style, { left: frameRect.left + 'px', top: frameRect.top + 'px', width: frameRect.width + 'px', height: frameRect.height + 'px' });
    layer.hidden = frameRect.width === 0 || frameRect.height === 0 || state.showAnnotations === false;
    session.paperHost.style.setProperty('--notes-display', layer.hidden ? 'none' : 'block');
    if (layer.hidden) return;
    if (!session.suppressed?.node.isConnected) {
      const node = view._iframeWindow.document.getElementById('pastel-pen');
      if (node) {
        session.suppressed = { node, value: node.style.getPropertyValue('display'), priority: node.style.getPropertyPriority('display') };
        node.style.setProperty('display', 'none', 'important');
      }
    }
    const scroller = view._iframeWindow.document.getElementById('viewerContainer') || view._iframeWindow.document.scrollingElement;
    // Reserve the native scrollbar's hit area, including overlay scrollbars.
    session.rail.style.right = Math.max(12, scroller.offsetWidth - scroller.clientWidth) + 'px';
    const horizontal = scroller.scrollWidth > scroller.clientWidth + 1 && scroller.scrollHeight <= scroller.clientHeight + 1;
    const total = horizontal ? scroller.scrollWidth : Math.max(scroller.scrollHeight, scroller.clientHeight);
    const annotations = state.annotations.filter(a => !a._hidden);
    const occupied = [];
    const locations = [];
    const cardIDs = new Set();
    const hostRect = session.paperHost.getBoundingClientRect();
    const pdf = view._iframeWindow.PDFViewerApplication;
    for (const a of annotations) {
      let rect;
      if (pdf && a.position.rects) {
        const { scrollLeft, scrollTop } = scroller;
        let saved = session.pageRects.get(a.position);
        if (!saved) {
          rect = this.rect(view, a);
          if (!rect) continue;
          saved = [rect[0]+scrollLeft,rect[1]+scrollTop,rect[2]+scrollLeft,rect[3]+scrollTop];
          session.pageRects.set(a.position,saved);
        }
        rect = [saved[0]-scrollLeft,saved[1]-scrollTop,saved[2]-scrollLeft,saved[3]-scrollTop];
      } else rect = this.rect(view,a);
      if (!rect) continue;
      const outsideX = rect[2] < 0 || rect[0] > frameRect.width;
      const offset = horizontal ? Math.abs(scroller.scrollLeft) + (scroller.scrollLeft < 0 ? frameRect.width - rect[2] : rect[0]) : rect[1] + scroller.scrollTop;
      locations.push({ annotation: a, top: Math.max(0, Math.min(1, offset / total)) * Math.max(0, frameRect.height - 22), inView: !outsideX && rect[3] >= 0 && rect[1] <= frameRect.height });
      const key = (session.primary ? 'p:' : 's:') + a.id;
      const placement = this.host.getLayout(a.id);
      if (!placement.open) continue;
      cardIDs.add(key);
      const paper = this.paper(view, a);
      const width = 300, height = 210;
      const scale = Math.min(placement.scale || 1, paper.width / (paper.zoom * width));
      const visualWidth = width * paper.zoom * scale;
      const visualHeight = height * paper.zoom * scale;
      let left = paper.left + (placement.x ?? 1) * (paper.width - visualWidth);
      let top = rect[1] + (placement.dy || 0) * paper.units;
      if (placement.dy === undefined) {
        const gap = 8 * paper.zoom;
        for (const other of occupied) {
          if (left < other.right + gap && left + visualWidth > other.left - gap
            && top < other.bottom + gap && top + visualHeight > other.top - gap) top = other.bottom + gap;
        }
      }
      occupied.push({ left, right: left + visualWidth, top, bottom: top + visualHeight });
      let entry = this.cards.get(key);
      const nearby = left <= frameRect.width + 400 && left + visualWidth >= -400 && top <= frameRect.height + 400 && top + visualHeight >= -400;
      if (!entry && !nearby) continue;
      if (!entry) {
        // Load papers on approach, then retain them until collapsed. Native
        // scrolling must never wait for an iframe and Markdown to be rebuilt.
        entry = this.makeCard(session, a); this.cards.set(key, entry);
      }
      entry.annotation = a;
      entry.remove.hidden = entry.editor.readOnly = !this.writable(a);
      if (!entry.editing && entry.editor.value !== a.comment) {
        const { selectionStart, selectionEnd, selectionDirection } = entry.editor;
        entry.editor.value = a.comment || '';
        entry.editor.setSelectionRange(selectionStart, selectionEnd, selectionDirection);
        this.preview(entry);
      }
      if (!entry.resizing) entry.shell.style.setProperty('--note-scale', scale);
      entry.shell.style.setProperty('--note-transform', pdf
        ? 'scale(calc(var(--scale-factor) * .75 * var(--note-scale)))'
        : 'scale(calc(var(--scale, var(--content-scale, 1)) * var(--note-scale)))');
      entry.noteDoc.documentElement.style.colorScheme = view._iframeWindow.document.documentElement.getAttribute('data-color-scheme') || this.win.getComputedStyle(this.doc.documentElement).colorScheme;
      entry.card.style.setProperty('--annotation-color', a.color);
      if (!entry.moving && !entry.resizing) {
        entry.shell.style.setProperty('--note-left', left - hostRect.left + 'px');
        entry.shell.style.setProperty('--note-top', top - hostRect.top + 'px');
        if (placement.dy === undefined) {
          this.host.setLayout(a.id, {
            x: (left - paper.left) / Math.max(1, paper.width - visualWidth),
            dy: (top - rect[1]) / paper.units
          });
        }
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
      if (last && location.top - last[0].top < 20) last.push(location);
      else groups.push([location]);
    }
    const selected = this.core._state.selectedAnnotationIDs;
    const signature = JSON.stringify(groups.map(group => group.map(({ annotation: a, top, inView }) => [a.id, a.text, a.comment, a.color, Math.round(top), inView, selected.includes(a.id)])));
    if (session.markerSignature === signature) return;
    session.markerSignature = signature;
    session.rail.replaceChildren();
    const label = a => [a.pageLabel && 'Page ' + a.pageLabel, a.text, a.comment].filter(Boolean).join(' · ').slice(0, 240) || 'Note';
    const navigate = id => { this.core.navigate({ annotationID: id }); this.core.setSelectedAnnotations([id]); };
    const dismiss = () => {
      session.rail.querySelector('.hibulb-marker-list')?.remove();
      for (const marker of session.rail.children) marker.ariaExpanded = 'false';
    };
    session.rail.onpointerleave = () => {
      if (!session.rail.contains(this.doc.activeElement)) dismiss();
    };
    session.rail.onfocusout = event => {
      if (!session.rail.contains(event.relatedTarget)) dismiss();
    };
    for (const group of groups) {
      const marker = this.el('button', 'hibulb-marker');
      marker.type = 'button';
      marker.ariaLabel = group.length === 1 ? label(group[0].annotation) : group.length + ' annotations in this part of the document';
      marker.ariaExpanded = 'false';
      marker.style.setProperty('--marker-color', group[0].annotation.color);
      marker.style.top = group[0].top + 'px';
      marker.classList.toggle('in-view', group.some(item => item.inView));
      marker.classList.toggle('has-note', group.some(({ annotation: a }) => a.comment?.trim() || a.type === 'note'));
      marker.classList.toggle('grouped', group.length > 1);
      marker.setAttribute('aria-current', String(group.some(({ annotation: a }) => selected.includes(a.id))));
      const show = () => {
        if (marker.ariaExpanded === 'true' && session.rail.querySelector('.hibulb-marker-list')) return;
        dismiss();
        const list = this.el('div', 'hibulb-marker-list');
        list.setAttribute('role', 'group'); list.ariaLabel = 'Choose annotation';
        for (const item of group) {
          const a = item.annotation;
          const b = this.el('button'); b.type = 'button'; b.ariaLabel = label(a);
          b.style.setProperty('--marker-color', a.color);
          if (a.pageLabel) b.append(this.el('span', 'hibulb-marker-page', 'Page ' + a.pageLabel));
          if (a.text) b.append(this.el('span', 'hibulb-marker-quote', a.text.slice(0, 280)));
          if (a.comment) b.append(this.el('span', 'hibulb-marker-note', a.comment.slice(0, 280)));
          if (!a.text && !a.comment) b.append(this.el('span', 'hibulb-marker-note', 'Note'));
          b.onclick = () => { navigate(a.id); dismiss(); };
          list.append(b);
        }
        session.rail.append(list);
        list.style.top = Math.max(0, Math.min(group[0].top, session.rail.clientHeight - list.offsetHeight)) + 'px';
        marker.ariaExpanded = 'true';
      };
      // Replacing a marker under a stationary pointer fires pointerenter again.
      // Require movement so scrolling cannot reopen a dismissed preview.
      marker.onpointermove = show;
      marker.onfocus = show;
      marker.onclick = () => {
        if (group.length === 1) { navigate(group[0].annotation.id); dismiss(); }
        else { show(); session.rail.querySelector('.hibulb-marker-list button')?.focus(); }
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
    session.cleanups.forEach(cleanup => cleanup()); session.style.remove(); session.layer.remove(); session.paperHost.remove();
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
    this.noteUI.clear();
    this.doc.querySelectorAll('.hibulb-sidebar-note').forEach(node => node.remove());
    this.doc.body.removeAttribute('data-hibulb-primary-popup');
    this.doc.body.removeAttribute('data-hibulb-secondary-popup');
    this.doc.body.classList.remove('hibulb-enabled');
    this.host.closed();
  }
};
