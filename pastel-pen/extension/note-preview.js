(() => {
  const callbacks = new WeakMap();
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      callbacks.get(entry.target)?.();
    }
  });
  let markdown;
  let math;
  const load = (name) => import(browser.runtime.getURL("vendor/" + name + ".mjs"));

  async function render(source) {
    markdown ??= load("markdown");
    const { html, equations } = (await markdown).renderMarkdown(source);
    if (!equations.length) return html;
    math ??= load("math");
    const { renderMath } = await math;
    return html.replace(/<span data-pastel-equation="(\d+)"><\/span>/g,
      (_, index) => renderMath(equations[Number(index)]));
  }

  function attach(card, editor) {
    const view = PastelPen.element("div", "sticky-preview");
    view.hidden = true;
    view.tabIndex = 0;
    view.ariaLabel = "Note preview. Press Enter to edit.";
    view.title = "Click to edit note";
    editor.after(view);
    let cachedSource;
    let cachedHTML;
    let displayedHTML;
    let loadingSource;
    let disposed = false;

    function edit() {
      view.hidden = true;
      editor.hidden = false;
      editor.focus({ preventScroll: true });
    }
    view.onclick = (event) => {
      if (event.target.closest("a") || !getSelection()?.isCollapsed) return;
      edit();
    };
    view.onkeydown = (event) => {
      if (event.target !== view || event.key !== "Enter") return;
      event.preventDefault();
      edit();
    };

    function show(html) {
      if (displayedHTML !== html) {
        view.innerHTML = html;
        displayedHTML = html;
      }
      view.hidden = false;
      editor.hidden = true;
    }

    function refresh() {
      const source = editor.value;
      if (disposed || editor.matches(":focus")) return;
      if (!/[#*_~`[>$\\|<&]|^\s*(?:[-+]|\d+[.)])\s/m.test(source)) {
        observer.unobserve(card);
        view.hidden = true;
        editor.hidden = false;
        return;
      }
      if (cachedSource === source) return show(cachedHTML);
      observer.observe(card);
    }

    callbacks.set(card, async () => {
      const source = editor.value;
      if (disposed || editor.matches(":focus") || loadingSource === source) return;
      loadingSource = source;
      try {
        const html = await render(source);
        if (disposed || editor.value !== source) return;
        cachedSource = source;
        cachedHTML = html;
        if (!editor.matches(":focus")) show(html);
      } catch (error) {
        console.warn("HiBulb could not render a note", error);
        if (!disposed && editor.value === source) {
          view.hidden = true;
          editor.hidden = false;
        }
      } finally {
        if (loadingSource === source) loadingSource = undefined;
      }
    });

    return {
      edit,
      refresh,
      dispose() {
        disposed = true;
        observer.unobserve(card);
        callbacks.delete(card);
      }
    };
  }

  globalThis.PastelNotePreview = { attach };
})();
