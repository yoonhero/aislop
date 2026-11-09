const { key, articleKey, read, colors, colorIndex, element: el } = PastelPen;
const $ = (id) => document.getElementById(id);
const reader = $("reader");
const entries = $("entries");
const search = $("search");
const url = new URL(location.href);
let active = url.searchParams.get("id") || "";
let source = url.searchParams.get("source") || "";
let mobileOpen = Boolean(active || source);
let data = read();
let current;
let snapshot;
let snapshotSource;
let snapshotRevision = 0;
let requested = active;
const sections = new Map();
let listState;
const write = (action, value, id) => browser.runtime.sendMessage({ type: "pastel-write", action, value, id });

function button(label, action, className) {
  const b = el("button", className, label);
  b.type = "button";
  b.onclick = action;
  return b;
}

function notebooks() {
  const query = search.value.trim().toLocaleLowerCase();
  const groups = new Map();
  for (const item of data.items) {
    const id = PastelPenScope.cleanPage(item.url);
    if (!groups.has(id)) groups.set(id, { id, title: item.title || new URL(item.url).hostname, items: [] });
    groups.get(id).items.push(item);
  }
  return [...groups.values()].filter((book) => !query || book.items.some((item) =>
    [item.note, item.quote, item.exact, item.title, item.url].join(" ").toLocaleLowerCase().includes(query)))
    .map((book) => ({
      ...book,
      items: book.items.sort((a, b) => (a.start ?? Infinity) - (b.start ?? Infinity) ||
        String(a.createdAt).localeCompare(String(b.createdAt)))
    }));
}

function label(item) {
  return String(item.quote || item.exact).replace(/\s+/g, " ").trim();
}

function renderList(books) {
  const state = JSON.stringify([source, active, search.value, books.map((book) => [book.id, book.title, book.items.map(({ id }) => id)])]);
  if (state === listState) return;
  listState = state;
  entries.replaceChildren(...books.map((book) => {
    const group = el("details", "book");
    group.open = book.id === source;
    const heading = el("summary", "entry", book.title || "Untitled article");
    group.append(heading);
    const list = el("ol", "contents");
    for (const item of book.items) {
      const link = button(label(item), () => select(book, item.id), "contents-link");
      link.title = label(item);
      if (item.id === active) link.setAttribute("aria-current", "location");
      const row = el("li");
      row.append(link);
      list.append(row);
    }
    group.append(list);
    return group;
  }));
  if (!books.length) entries.append(el("p", "empty-list", search.value ? "No matching articles." : "Saved articles will appear here."));
}

function select(book, id) {
  source = book.id;
  active = id;
  requested = id;
  mobileOpen = true;
  render();
  requestAnimationFrame(() => reveal(id, true));
}

function reveal(id, focus = false) {
  const section = sections.get(id);
  if (!section) return;
  if (focus) section.heading.focus({ preventScroll: true });
  section.heading.scrollIntoView({ block: "center" });
}

function render() {
  const books = notebooks();
  const book = books.find((entry) => entry.id === source) ||
    books.find((entry) => entry.items.some((item) => item.id === active)) || books[0];
  source = book?.id;
  if (!book?.items.some((item) => item.id === active)) active = book?.items[0]?.id;
  renderList(books);
  document.body.classList.toggle("reading", mobileOpen);
  if (source !== snapshotSource) {
    snapshotSource = source;
    snapshot = undefined;
    if (source) {
      const request = source;
      const storageKey = articleKey(request);
      browser.storage.local.get(storageKey).then((result) => {
        if (source !== request) return;
        snapshot = result[storageKey] || null;
        snapshotRevision++;
        render();
      });
    }
  }
  const view = book ? JSON.stringify([book.id, book.items.map(({ id }) => id), snapshotRevision]) : "";
  if (current !== view || !reader.firstChild) {
    current = view;
    flush();
    for (const section of sections.values()) {
      section.observer?.disconnect();
      section.note?.dispose();
    }
    sections.clear();
    reader.replaceChildren(book ? detail(book) : empty());
    reader.scrollTop = 0;
    if (requested === active) requestAnimationFrame(() => reveal(active));
  }
  for (const item of book?.items || []) syncPassage(sections.get(item.id), item);
}

function empty() {
  const box = el("section", "empty-reader");
  box.append(el("p", "eyebrow", "Your reading notebook"),
    el("h1", "", search.value ? "No matching passages" : "Keep what stands out."),
    el("p", "", "Turn on the pen on a page, select a passage, and save a highlight or attach a note."));
  return box;
}

function detail(book) {
  const article = el("article", "detail");
  const bar = el("div", "detail-bar");
  bar.append(button("‹ Notebooks", () => {
    mobileOpen = false;
    render();
    entries.querySelector(".book[open] summary")?.focus();
  }, "back"));
  const link = el("a", "source", "Open original ↗");
  link.href = book.id;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  bar.append(link);
  article.append(bar, el("h1", "", book.title || "Untitled article"));
  const flow = el("div", "reader-flow");
  if (snapshot === undefined) {
    flow.append(el("p", "reader-hint", "Loading saved article…"));
  } else if (Array.isArray(snapshot?.blocks) && snapshot.blocks.length && typeof snapshot.text === "string") {
    renderArticle(flow, book);
  } else {
    flow.append(el("p", "reader-hint", "Saved excerpts. Open the original and use its Notebook button to capture the full text."));
    for (const item of book.items) {
      const row = el("section", "reader-row");
      const excerpt = preview(item);
      excerpt.classList.add("reader-copy");
      excerpt.tabIndex = -1;
      row.append(excerpt);
      attachAnnotations(row, [{ item, heading: excerpt, marks: [...excerpt.querySelectorAll("mark")] }]);
      flow.append(row);
    }
  }
  article.append(flow);
  return article;
}

const blockTags = new Set("h1 h2 h3 h4 h5 h6 p li blockquote pre figcaption td d-math".split(" "));
const inlineTags = new Set("sup sub em strong b i code".split(" "));

function renderArticle(flow, book) {
  const offset = Number.isFinite(snapshot.offset) ? snapshot.offset : 0;
  const anchors = book.items.flatMap((item) => {
    const range = PastelAnchors.locate({ ...item, start: item.start - offset, end: item.end - offset }, snapshot);
    return range ? [{ item, start: range.start + offset, end: range.end + offset }] : [];
  });
  for (const block of snapshot.blocks) {
    if (!Array.isArray(block?.chunks) || !block.chunks.length) continue;
    const tag = blockTags.has(block.tag) && !["li", "td", "d-math"].includes(block.tag) ? block.tag : "p";
    if (tag === "h1" && block.chunks.map((chunk) => chunk?.text || "").join("").trim() === book.title.trim()) continue;
    const row = el("section", "reader-row");
    const copy = el(tag, "reader-copy");
    if (block.tag === "li") copy.classList.add("reader-list-item");
    if (block.tag === "d-math") copy.classList.add("reader-equation");
    row.append(copy);
    const annotations = [];
    for (const chunk of block.chunks) {
      if (typeof chunk?.text !== "string" || !Number.isFinite(chunk.start) || !Number.isFinite(chunk.end)) continue;
      const hits = anchors.filter((anchor) => anchor.start < chunk.end && anchor.end > chunk.start);
      const renderChunk = (text, covering) => {
        const inline = inlineTags.has(chunk.inline) ? el(chunk.inline) : null;
        const content = chunk.math && mathNode(chunk.math) || document.createTextNode(text);
        inline?.append(content);
        if (!covering.length) {
          copy.append(inline || content);
          return;
        }
        const mark = el("mark", chunk.math ? "formula" : "");
        mark.append(inline || content);
        copy.append(mark);
        for (const { item } of covering) {
          const existing = sections.get(item.id) || annotations.find((annotation) => annotation.item.id === item.id);
          if (existing) existing.marks.push(mark);
          else {
            mark.tabIndex = -1;
            annotations.push({ item, heading: mark, marks: [mark] });
          }
        }
      };
      if (!hits.length || chunk.atomic) {
        renderChunk(chunk.text, hits);
        continue;
      }
      const cuts = [...new Set([chunk.start, chunk.end, ...hits.flatMap(({ start, end }) =>
        [Math.max(start, chunk.start), Math.min(end, chunk.end)])])].sort((a, b) => a - b);
      for (let i = 1; i < cuts.length; i++) {
        const start = cuts[i - 1];
        const end = cuts[i];
        renderChunk(chunk.text.slice(start - chunk.start, end - chunk.start),
          hits.filter((hit) => hit.start < end && hit.end > start));
      }
    }
    attachAnnotations(row, annotations);
    flow.append(row);
  }
  const missing = book.items.filter((item) => !sections.has(item.id));
  if (missing.length) flow.append(el("p", "reader-hint", "Highlights outside the captured article"));
  for (const item of missing) {
    const row = el("section", "reader-row");
    const excerpt = preview(item);
    excerpt.classList.add("reader-copy");
    excerpt.tabIndex = -1;
    row.append(excerpt);
    attachAnnotations(row, [{ item, heading: excerpt, marks: [...excerpt.querySelectorAll("mark")] }]);
    flow.append(row);
  }
}

function attachAnnotations(row, annotations) {
  if (!annotations.length) return;
  const aside = el("aside", "reader-notes");
  aside.ariaLabel = "Notes for this passage";
  for (const { item, heading, marks } of annotations) {
    const canvas = el("div", "reading-canvas");
    const section = { heading, canvas, marks };
    const options = el("details", "passage-options");
    const more = el("summary", "", "···");
    more.title = more.ariaLabel = "Passage options";
    options.append(more, button("Delete highlight and note", async () => {
      if (!confirm("Delete this highlight and its note?")) return;
      await section.note?.flush();
      await write("remove", undefined, item.id);
    }, "delete"));
    canvas.append(options);
    aside.append(canvas);
    sections.set(item.id, section);
  }
  row.append(aside);
}

function syncPassage(section, item) {
  if (!section) return;
  const { canvas } = section;
  for (const mark of section.marks) mark.style.setProperty("--tint", colors[colorIndex(item.color)][1]);
  const folded = Boolean(item.notebookFolded || item.notebookFolded !== false && !item.note && item.folded !== false && !item.notebookPlacement);
  if (section.folded !== folded) {
    section.folded = folded;
    section.observer?.disconnect();
    section.note?.flush();
    section.note?.dispose();
    section.note = null;
    canvas.className = "reading-canvas";
    canvas.querySelector(".sticky")?.remove();
    canvas.querySelector(".open-sticky")?.remove();
    if (folded) {
      canvas.append(button(item.note ? "▤ Open sticky note" : "+ Add sticky note", async () => {
        data = read(await write("notebookFolded", false, item.id));
        render();
        section.note?.edit();
      }, "open-sticky"));
    } else mountSticky(section, item);
  } else if (section.note) {
    section.note.item = item;
    section.note.update(item);
  }
}

function mountSticky(section, item) {
  const { canvas } = section;
  canvas.classList.add("with-sticky");
  const note = PastelSticky.create({
    item,
    save: (action, value) => write(action, value, item.id),
    collapse: async () => {
      await note.flush();
      data = read(await write("notebookFolded", true, item.id));
      render();
      canvas.querySelector(".open-sticky")?.focus({ preventScroll: true });
    },
    layout(rect, dx, dy, persist) {
      if (!rect) return position();
      const bounds = canvas.getBoundingClientRect();
      const placement = position({ x: rect.x - bounds.x + dx, y: rect.y - bounds.y + dy, w: rect.width, h: rect.height });
      if (persist) {
        note.item = { ...note.item, notebookPlacement: placement };
        write("notebookPlacement", placement, item.id);
      }
    }
  });
  note.item = item;
  section.note = note;
  canvas.append(note.card);
  function position(placement) {
    const width = canvas.clientWidth;
    const roomy = width >= 740;
    canvas.classList.toggle("roomy", roomy);
    const height = canvas.clientHeight;
    if (!width || !height) return;
    const base = placement || note.item.notebookPlacement || {
      x: roomy ? width - 372 : 12,
      y: 12,
      w: Math.min(360, width - 24),
      h: 244
    };
    const next = PastelSticky.constrain(base, width, height);
    PastelSticky.place(note.card, next);
    return next;
  }
  section.observer = new ResizeObserver(() => { if (!note.busy) position(); });
  section.observer.observe(canvas);
}

function preview(item) {
  const frame = el("section", "preview");
  frame.ariaLabel = "Source passage";
  const body = el("div", "passage");
  const blocks = Array.isArray(item.context) && item.context.length ? item.context :
    [[{ text: item.prefix, marked: false }, { text: item.quote || item.exact, marked: true }, { text: item.suffix, marked: false }]];
  for (const block of blocks) {
    if (!Array.isArray(block)) continue;
    const paragraph = el("p");
    for (const chunk of block) {
      if (typeof chunk?.text !== "string") continue;
      const node = el(chunk.marked ? "mark" : "span", chunk.math ? "formula" : "");
      node.append(chunk.math && mathNode(chunk.math) || document.createTextNode(chunk.text));
      paragraph.append(node);
    }
    body.append(paragraph);
  }
  frame.append(body);
  return frame;
}

const mathTags = new Set("math mrow mi mn mo mtext mspace ms mfrac msqrt mroot mstyle mphantom mpadded msub msup msubsup munder mover munderover mmultiscripts mprescripts none mtable mtr mtd".split(" "));
function mathNode(tree, depth = 0) {
  if (typeof tree === "string") return document.createTextNode(tree);
  if (!Array.isArray(tree) || !mathTags.has(tree[0]) || depth > 30) return null;
  const node = document.createElementNS("http://www.w3.org/1998/Math/MathML", tree[0]);
  for (const child of tree.slice(1)) {
    const element = mathNode(child, depth + 1);
    if (element) node.append(element);
  }
  return node;
}

function flush() {
  return Promise.all([...sections.values()].map((section) => section.note?.flush()));
}

search.value = url.searchParams.get("q") || "";
search.oninput = () => {
  flush();
  mobileOpen = false;
  render();
};
addEventListener("pagehide", flush);
$("exportBtn").onclick = async () => {
  await flush();
  const stored = await browser.storage.local.get(null);
  const payload = read(stored[key]);
  payload.articles = Object.fromEntries([...new Set(payload.items.map((item) => PastelPenScope.cleanPage(item.url)))]
    .filter((page) => stored[articleKey(page)]).map((page) => [page, stored[articleKey(page)]]));
  const objectURL = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  const a = el("a");
  a.href = objectURL;
  a.download = "pastel-pen-notebook.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(objectURL), 1000);
};
$("importFile").onchange = async (event) => {
  const input = event.currentTarget;
  const file = input.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const value = file.name.endsWith(".jsonl") ? text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)) : JSON.parse(text);
    const incoming = read(Array.isArray(value) ? { items: value } : value);
    if (!incoming.items.length) throw new Error("No valid highlights");
    await flush();
    await write("import", incoming);
    const snapshots = Object.fromEntries(Object.entries(value?.articles || {})
      .filter(([page, article]) => incoming.items.some((item) => PastelPenScope.cleanPage(item.url) === page) &&
        typeof article?.text === "string" && Array.isArray(article.blocks))
      .map(([page, article]) => [articleKey(page), article]));
    if (Object.keys(snapshots).length) await browser.storage.local.set(snapshots);
    $("notice").textContent = "Imported " + incoming.items.length + " highlights.";
  } catch (error) {
    $("notice").textContent = error.message;
  } finally {
    input.value = "";
  }
};

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  const articleChange = source && changes[articleKey(source)];
  if (articleChange) {
    snapshot = articleChange.newValue || null;
    snapshotRevision++;
  }
  if (changes[key]) data = read(changes[key].newValue);
  if (articleChange || changes[key]) render();
});
browser.storage.local.get(key).then((result) => {
  data = read(result[key]);
  render();
});
