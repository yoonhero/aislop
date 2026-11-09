(() => {
  const { element: el, colors, colorIndex } = PastelPen;
  const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));

  function create({ item, save, collapse, layout }) {
    const card = el("section", "sticky");
    card.ariaLabel = "Sticky note";
    const grip = el("button", "sticky-grip", "⠿");
    grip.type = "button";
    grip.ariaLabel = "Move sticky note";
    grip.title = "Drag to move. Arrow keys also move the note.";
    const fold = el("button", "sticky-fold", "−");
    fold.type = "button";
    fold.ariaLabel = "Collapse sticky note";
    fold.onclick = collapse;
    const head = el("header", "sticky-head");
    head.append(grip, fold);

    const editor = el("textarea", "sticky-editor");
    editor.ariaLabel = "Sticky note text";
    editor.placeholder = "Write a note… Markdown and $math$ supported.";
    editor.maxLength = 4000;
    const status = el("span", "sticky-status");
    status.setAttribute("role", "status");
    card.append(head, editor, status);
    const preview = PastelNotePreview.attach(card, editor);

    let draft;
    let timer;
    let busy = false;
    function flush() {
      clearTimeout(timer);
      if (draft === undefined) return;
      const value = draft;
      draft = undefined;
      return save("note", value).then(() => {
        if (draft === undefined) status.textContent = "Saved";
      }, () => {
        draft ??= value;
        status.textContent = "Save failed";
      });
    }
    editor.oninput = () => {
      draft = editor.value;
      status.textContent = "Saving…";
      clearTimeout(timer);
      timer = setTimeout(flush, 200);
    };
    editor.onblur = () => {
      flush();
      preview.refresh();
    };
    function update(next) {
      card.style.setProperty("--paper", colors[colorIndex(next.paper || next.color)][1]);
      if (draft === undefined && !editor.matches(":focus")) {
        editor.value = next.note || "";
        preview.refresh();
      }
    }

    let start;
    grip.onpointerdown = (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      grip.focus({ preventScroll: true });
      start = { x: event.clientX, y: event.clientY, rect: card.getBoundingClientRect(), id: event.pointerId };
      busy = true;
      card.classList.add("handling");
      grip.setPointerCapture(event.pointerId);
    };
    grip.onpointermove = (event) => {
      if (start?.id !== event.pointerId) return;
      layout(start.rect, event.clientX - start.x, event.clientY - start.y, false);
    };
    grip.onpointerup = (event) => {
      if (start?.id !== event.pointerId) return;
      const { rect, x, y } = start;
      start = undefined;
      busy = false;
      card.classList.remove("handling");
      if (event.clientX !== x || event.clientY !== y) layout(rect, event.clientX - x, event.clientY - y, true);
    };
    grip.onlostpointercapture = () => {
      if (!start) return;
      start = undefined;
      busy = false;
      card.classList.remove("handling");
      layout();
    };
    grip.onkeydown = (event) => {
      const delta = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -12], ArrowDown: [0, 12] }[event.key];
      if (!delta) return;
      event.preventDefault();
      layout(card.getBoundingClientRect(), ...delta, true);
    };
    update(item);
    return { card, editor, edit: preview.edit, dispose: preview.dispose, update, flush, get busy() { return busy; } };
  }

  function constrain(rect, width, height) {
    const w = clamp(rect.w, Math.min(320, width - 16), width - 16);
    const h = clamp(rect.h, Math.min(244, height - 16), height - 16);
    return { x: clamp(rect.x, 8, width - w - 8), y: clamp(rect.y, 8, height - h - 8), w, h };
  }

  function place(card, { x, y, w, h }) {
    Object.assign(card.style, { left: x + "px", top: y + "px", width: w + "px", height: h + "px" });
  }

  globalThis.PastelSticky = { create, constrain, place };
})();
