const api = globalThis.browser || globalThis.chrome;
const KEY = "pastelPen.highlights.v1";
const COLORS = [
  ["lemon", "#fff176", "255,241,118"], ["mint", "#b8f7d4", "184,247,212"],
  ["peach", "#ffc6a8", "255,198,168"], ["rose", "#ffb7cf", "255,183,207"],
  ["sky", "#bfe4ff", "191,228,255"], ["lilac", "#d9c7ff", "217,199,255"]
];
let data = { items: [], prefs: {} };
let query = new URLSearchParams(location.search).get("q") || "";
let activeView = new URLSearchParams(location.search).get("view") === "explore" ? "explore" : "archive";
let focusId = "";
let exploreHistory = [];

boot();

async function boot() {
  data = normalize((await api.storage.local.get(KEY))[KEY]);
  today.textContent = new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(new Date());
  q.value = query;
  q.oninput = () => (query = q.value.trim().toLowerCase(), render());
  archiveView.onclick = () => setView("archive");
  exploreView.onclick = () => setView("explore");
  backBtn.onclick = () => goBack();
  nextBtn.onclick = () => nextLine();
  explorePane.onclick = exploreClick;
  exportBtn.onclick = exportJson;
  printBtn.onclick = () => window.print();
  clearBtn.onclick = async () => confirm("Remove every saved clipping from this Firefox profile?") && save({ ...data, items: [] });
  importFile.onchange = importFileContents;
  render();
  setView(activeView);
}

function render() {
  const items = visibleItems();
  const pages = groupBy(items, (x) => x.url);
  stats.textContent = `${items.length} ${items.length === 1 ? "clipping" : "clippings"} · ${pages.size} ${pages.size === 1 ? "source" : "sources"}`;
  list.replaceChildren(...(items.length ? [...pages].map(([url, xs]) => pageCard(url, xs)) : [empty()]));
  if (activeView === "explore") renderExplore(items);
}

function setView(view) {
  activeView = view;
  archivePane.hidden = view !== "archive";
  explorePane.hidden = view !== "explore";
  archiveView.ariaPressed = String(view === "archive");
  exploreView.ariaPressed = String(view === "explore");
  archiveView.classList.toggle("is-active", view === "archive");
  exploreView.classList.toggle("is-active", view === "explore");
  if (view === "explore") renderExplore(visibleItems());
}

function visibleItems() {
  return data.items.filter(match).sort((a, b) => dateValue(b) - dateValue(a));
}

function renderExplore(items) {
  sourceList.replaceChildren();
  if (!items.length) {
    focusId = "";
    focusCard.replaceChildren(exploreEmpty());
    backBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }
  const current = items.find((item) => item.id === focusId) || items[0];
  focusId = current.id;
  const sources = [...groupBy(items, (item) => item.url)].sort((a, b) => titleFor(a[1][0]).localeCompare(titleFor(b[1][0])));
  sourceList.append(...sources.map(([url, xs]) => sourceLink(url, xs, current)));
  focusCard.replaceChildren(focusArticle(current, items));
  backBtn.disabled = exploreHistory.length === 0;
  nextBtn.disabled = items.length < 2;
}

function sourceLink(url, items, current) {
  const link = document.createElement("button");
  const title = document.createElement("strong");
  const meta = document.createElement("small");
  link.className = "source-link";
  link.type = "button";
  link.dataset.sourceUrl = url;
  link.ariaPressed = String(url === current.url);
  title.textContent = titleFor(items[0]);
  meta.textContent = `${host(url)} · ${items.length} ${items.length === 1 ? "line" : "lines"}`;
  link.append(title, meta);
  return link;
}

function focusArticle(item, items) {
  const card = document.createDocumentFragment();
  const meta = document.createElement("div");
  const title = document.createElement("h2");
  const source = document.createElement("a");
  const quote = document.createElement("blockquote");
  const highlight = document.createElement("span");
  const footer = document.createElement("footer");
  const stamp = document.createElement("time");
  const actions = document.createElement("span");
  const related = document.createElement("section");
  const relatedTitle = document.createElement("h3");
  const relatedList = document.createElement("div");

  meta.className = "focus-meta";
  meta.textContent = `${String(items.indexOf(item) + 1).padStart(2, "0")} / ${items.length} · ${host(item.url)}`;
  title.textContent = titleFor(item);
  source.href = item.url;
  source.target = "_blank";
  source.rel = "noreferrer";
  source.textContent = short(item.url);
  quote.className = "focus-quote";
  quote.style.setProperty("--c", item.color);
  highlight.textContent = item.quote || item.exact;
  quote.append(highlight);
  stamp.textContent = formatDate(item.createdAt);
  actions.className = "focus-actions";
  actions.append(exploreButton("copy", "copy", item.id), exploreButton("open", "open", item.id));
  footer.append(stamp, actions);
  related.className = "related-reading";
  relatedTitle.textContent = "Follow a thread";
  relatedList.className = "related-list";
  for (const match of relatedItems(item, items)) relatedList.append(relatedLink(match, item));
  if (!relatedList.children.length) relatedList.append(exploreEmpty("Save another line to start a thread."));
  related.append(relatedTitle, relatedList);
  card.append(meta, title, source, quote, footer, related);
  return card;
}

function relatedLink(match, current) {
  const link = document.createElement("button");
  const label = document.createElement("span");
  const title = document.createElement("strong");
  const quote = document.createElement("span");
  const relation = document.createElement("small");
  const shared = [...terms(current)].filter((term) => terms(match.item).has(term));
  link.className = "related-link";
  link.type = "button";
  link.dataset.focusId = match.item.id;
  label.className = "related-label";
  label.textContent = relationLabel(match.item, current, shared);
  title.textContent = titleFor(match.item);
  quote.textContent = match.item.quote || match.item.exact;
  relation.textContent = formatDate(match.item.createdAt);
  link.append(label, title, quote, relation);
  return link;
}

function relatedItems(item, items) {
  const currentTerms = terms(item);
  const currentHost = host(item.url);
  return items.filter((other) => other.id !== item.id).map((other) => {
    const shared = [...currentTerms].filter((term) => terms(other).has(term));
    let score = shared.length * 2;
    if (other.url === item.url) score += 10;
    if (host(other.url) === currentHost) score += 3;
    if (titleFor(other) === titleFor(item)) score += 4;
    return { item: other, score, shared };
  }).sort((a, b) => b.score - a.score || dateValue(b.item) - dateValue(a.item)).slice(0, 5);
}

function terms(item) {
  return new Set(`${titleFor(item)} ${item.quote || item.exact}`.toLowerCase().normalize("NFKC").split(/[^\p{L}\p{N}]+/u).filter((word) => {
    const length = /[가-힣]/u.test(word) ? word.length > 1 : word.length > 3;
    return length && !STOPWORDS.has(word);
  }));
}

const STOPWORDS = new Set("about after again against all also and are been being between both but can could for from have into its just like more most not only our over same saved should some than that their them then there these they this those through too very was were what when where which with your you 그리고 그러나 대한 하는 하는데 있는 있는지 을를 은는 이가 에서 으로 와과 도 를 한".split(/\s+/));

function relationLabel(item, current, shared) {
  if (item.url === current.url) return "same source";
  if (host(item.url) === host(current.url)) return "same site";
  return shared.length ? `shares ${shared.slice(0, 2).join(" · ")}` : "another saved line";
}

function exploreButton(label, action, id) {
  const b = button(label, "exploreAction", action);
  b.dataset.itemId = id;
  return b;
}

function exploreClick(event) {
  const target = event.target.closest("button");
  if (!target) return;
  if (target.dataset.sourceUrl) {
    const item = visibleItems().find((candidate) => candidate.url === target.dataset.sourceUrl);
    if (item) focusItem(item.id);
    return;
  }
  if (target.dataset.focusId) return focusItem(target.dataset.focusId);
  if (!target.dataset.exploreAction) return;
  const item = data.items.find((candidate) => candidate.id === target.dataset.itemId);
  if (!item) return;
  if (target.dataset.exploreAction === "open") return api.tabs.create({ url: item.url });
  if (target.dataset.exploreAction === "copy") return copyItem(item);
}

function focusItem(id, remember = true) {
  const item = visibleItems().find((candidate) => candidate.id === id);
  if (!item) return;
  if (remember && focusId && focusId !== id) exploreHistory.push(focusId);
  focusId = id;
  renderExplore(visibleItems());
}

function goBack() {
  const previous = exploreHistory.pop();
  if (previous) focusItem(previous, false);
}

function nextLine() {
  const items = visibleItems();
  if (items.length < 2) return;
  const index = Math.max(0, items.findIndex((item) => item.id === focusId));
  focusItem(items[(index + 1) % items.length].id);
}

function pageCard(url, xs) {
  const article = document.createElement("article");
  const header = document.createElement("header");
  const label = document.createElement("div");
  const section = document.createElement("span");
  const h2 = document.createElement("h2");
  const source = document.createElement("a");
  const count = document.createElement("span");
  const title = titleFor(xs[0]);

  article.className = "story";
  label.className = "story-label";
  section.textContent = "FROM THE WEB";
  h2.textContent = title;
  source.href = url;
  source.target = "_blank";
  source.rel = "noreferrer";
  source.textContent = short(url);
  count.className = "story-count";
  count.textContent = `${xs.length} ${xs.length === 1 ? "line" : "lines"}`;
  label.append(section, h2, source);
  header.append(label, count);
  article.append(header, ...xs.map(itemCard));
  return article;
}

function itemCard(item, index) {
  const figure = document.createElement("figure");
  const quote = document.createElement("blockquote");
  const figcaption = document.createElement("figcaption");
  const stamp = document.createElement("time");
  const number = document.createElement("span");
  const actions = document.createElement("span");

  figure.className = "clipping";
  figure.style.setProperty("--c", item.color);
  number.className = "clipping-number";
  number.textContent = String(index + 1).padStart(2, "0");
  quote.textContent = item.quote || item.exact;
  stamp.textContent = formatDate(item.createdAt);
  actions.className = "clipping-actions";
  actions.append(colorPicker(item), button("copy", "copy", item.id), button("open", "open", item.url), button("remove", "del", item.id));
  figcaption.append(number, stamp, actions);
  figure.append(quote, figcaption);
  return figure;
}

function colorPicker(item) {
  const picker = document.createElement("span");
  picker.className = "mini-colors";
  picker.title = "Change colour";
  for (const [name, color] of COLORS) {
    const b = document.createElement("button");
    b.className = "mini-color";
    b.type = "button";
    b.title = `Change to ${name}`;
    b.ariaLabel = `Change to ${name}`;
    b.dataset.recolor = item.id;
    b.dataset.color = color;
    b.style.background = color;
    b.ariaPressed = String(item.color === color);
    picker.append(b);
  }
  return picker;
}

list.onclick = async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.open) return api.tabs.create({ url: button.dataset.open });
  const item = data.items.find((x) => x.id === (button.dataset.copy || button.dataset.del || button.dataset.recolor));
  if (!item) return;
  if (button.dataset.copy) {
    return copyItem(item);
  }
  if (button.dataset.recolor) return recolor(item.id, button.dataset.color);
  if (button.dataset.del) return save({ ...data, items: data.items.filter((x) => x.id !== item.id) }).then(() => broadcast({ type: "PASTEL_PEN_REMOVE", id: item.id }));
};

async function recolor(id, color) {
  const meta = COLORS.find((x) => x[1] === color) || COLORS[0];
  data = { ...data, items: data.items.map((item) => item.id === id ? { ...item, color: meta[1], rgb: meta[2] } : item), prefs: { ...data.prefs, color: meta[1] } };
  await save(data);
  await broadcast({ type: "PASTEL_PEN_RECOLOR", id, color: meta[1] });
}

async function importFileContents() {
  const file = importFile.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const incoming = parseImport(text, file.name);
    const merged = new Map([...data.items, ...incoming.items].map((item) => [item.id, item]));
    await save({ prefs: { ...data.prefs, ...incoming.prefs }, items: [...merged.values()] });
    toast(`${incoming.items.length} ${incoming.items.length === 1 ? "clipping" : "clippings"} imported.`);
  } catch (error) {
    toast(`Could not import that file: ${error.message}`);
  } finally {
    importFile.value = "";
  }
}

function parseImport(text, name = "") {
  const raw = name.toLowerCase().endsWith(".jsonl") ? text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)) : JSON.parse(text);
  const value = Array.isArray(raw) ? { items: raw } : raw;
  return normalize(value);
}

function exportJson() {
  download(JSON.stringify({ app: "Pastel Pen", format: 2, exportedAt: new Date().toISOString(), ...data }, null, 2), `pastel-pen-clippings-${new Date().toISOString().slice(0, 10)}.json`);
}

async function save(next) {
  data = normalize(next);
  await api.storage.local.set({ [KEY]: data });
  render();
}

async function broadcast(message) {
  try {
    const tabs = await api.tabs.query({});
    await Promise.all(tabs.filter((tab) => tab.id).map((tab) => api.tabs.sendMessage(tab.id, message).catch(() => null)));
  } catch { /* review still works on protected pages */ }
}

function normalize(raw) {
  const value = raw && typeof raw === "object" ? raw : {};
  const prefs = value.prefs && typeof value.prefs === "object" ? value.prefs : {};
  return {
    prefs: PastelPenScope.normalizePrefs(prefs),
    items: Array.isArray(value.items) ? value.items.map(normalizeItem).filter(Boolean) : []
  };
}

function normalizeItem(item) {
  if (!item || typeof item !== "object" || !item.id || !item.url) return null;
  const color = COLORS.some((x) => x[1] === item.color) ? item.color : COLORS[0][1];
  const meta = COLORS.find((x) => x[1] === color) || COLORS[0];
  const exact = String(item.exact || item.quote || "").trim();
  if (!exact) return null;
  return { ...item, exact, quote: String(item.quote || exact), color, rgb: item.rgb || meta[2], createdAt: item.createdAt || new Date(0).toISOString() };
}

function match(item) {
  const hay = `${item.quote} ${item.exact} ${item.title} ${item.url}`.toLowerCase();
  return !query || hay.includes(query);
}

function groupBy(items, key) {
  const map = new Map();
  for (const item of items) map.set(key(item), [...(map.get(key(item)) || []), item]);
  return map;
}

function button(label, key, value) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  b.dataset[key] = value;
  return b;
}

async function copyItem(item) {
  await navigator.clipboard.writeText(`${item.quote || item.exact}\n\n${titleFor(item)}\n${item.url}`);
  toast("Copied to clipboard.");
}

function titleFor(item) {
  return String(item.title || host(item.url) || "Saved page").trim();
}

function exploreEmpty(message = "Save a line to begin exploring.") {
  const div = document.createElement("div");
  div.className = "explore-empty";
  div.textContent = message;
  return div;
}

function empty() {
  const div = document.createElement("div");
  div.className = "empty-paper";
  div.innerHTML = `<span class="kicker">NOTHING ON THE WIRE</span><h2>Your desk is clear.</h2><p>Select a sentence on any page, then save it with Pastel Pen. Your next good line will land here.</p>`;
  return div;
}

function toast(message) {
  const old = document.querySelector(".toast");
  old?.remove();
  const note = document.createElement("div");
  note.className = "toast";
  note.textContent = message;
  document.body.append(note);
  setTimeout(() => note.remove(), 2600);
}

function dateValue(item) { return Date.parse(item.createdAt) || 0; }
function formatDate(value) { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function download(text, name) {
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([text], { type: "application/json" })), download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function short(url) {
  try { const u = new URL(url); return `${u.hostname}${u.pathname}`.replace(/\/$/, "").slice(0, 96); }
  catch { return url; }
}
function host(url) {
  try { return new URL(url).hostname; }
  catch { return "Saved page"; }
}
