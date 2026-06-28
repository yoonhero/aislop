const api = globalThis.browser || globalThis.chrome;
const KEY = "pastelPen.highlights.v1";
let data = { items: [], prefs: {} };
let query = new URLSearchParams(location.search).get("q") || "";

boot();

async function boot() {
  data = (await api.storage.local.get(KEY))[KEY] || data;
  q.value = query;
  render();
  q.oninput = () => (query = q.value.trim().toLowerCase(), render());
  exportBtn.onclick = () => download(JSON.stringify(data, null, 2), `pastel-pen-${new Date().toISOString().slice(0, 10)}.json`);
  clearBtn.onclick = async () => confirm("Delete every local highlight?") && save({ ...data, items: [] });
  importFile.onchange = importJson;
}

function render() {
  const items = data.items.filter(match).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pages = Map.groupBy ? Map.groupBy(items, (x) => x.url) : groupBy(items, (x) => x.url);
  stats.textContent = `${items.length} shown / ${data.items.length} saved`;
  list.replaceChildren(...(items.length ? [...pages].map(([url, xs]) => pageCard(url, xs)) : [empty()]));
  list.onclick = act;
}

function pageCard(url, xs) {
  const article = document.createElement("article");
  const header = document.createElement("header");
  const head = document.createElement("div");
  const h2 = document.createElement("h2");
  const a = document.createElement("a");
  const count = document.createElement("span");
  const title = xs[0].title || host(url);
  article.className = "page";
  h2.textContent = title;
  a.href = url;
  a.target = "_blank";
  a.rel = "noreferrer";
  a.textContent = short(url);
  count.textContent = xs.length;
  head.append(h2, a);
  header.append(head, count);
  article.append(header, ...xs.map(itemCard));
  return article;
}

function itemCard(x) {
  const hit = document.createElement("div");
  const quote = document.createElement("blockquote");
  const meta = document.createElement("div");
  const time = document.createElement("time");
  hit.className = "hit";
  hit.style.setProperty("--c", x.color);
  quote.textContent = x.quote || x.exact;
  meta.className = "meta";
  time.textContent = new Date(x.createdAt).toLocaleString();
  meta.append(time, button("copy", "copy", x.id), button("open", "open", x.url), button("delete", "del", x.id));
  hit.append(quote, meta);
  return hit;
}

async function act(e) {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.open) return api.tabs.create({ url: b.dataset.open });
  const item = data.items.find((x) => x.id === (b.dataset.copy || b.dataset.del));
  if (!item) return;
  if (b.dataset.copy) return navigator.clipboard.writeText(`${item.quote || item.exact}\n${item.url}`);
  if (b.dataset.del) return save({ ...data, items: data.items.filter((x) => x.id !== item.id) });
}

async function importJson() {
  const file = importFile.files[0];
  if (!file) return;
  const incoming = JSON.parse(await file.text());
  const items = [...(incoming.items || []), ...data.items];
  const unique = [...new Map(items.map((x) => [x.id, x])).values()];
  await save({ prefs: { ...data.prefs, ...incoming.prefs }, items: unique });
}

async function save(next) {
  data = next;
  await api.storage.local.set({ [KEY]: data });
  render();
}

function match(x) {
  const hay = `${x.quote} ${x.exact} ${x.title} ${x.url}`.toLowerCase();
  return !query || hay.includes(query);
}

function groupBy(xs, f) {
  const m = new Map();
  for (const x of xs) m.set(f(x), [...(m.get(f(x)) || []), x]);
  return m;
}

function button(label, key, value) {
  const b = document.createElement("button");
  b.textContent = label;
  b.dataset[key] = value;
  return b;
}

function empty() {
  const div = document.createElement("div");
  div.className = "empty";
  div.textContent = "No saved highlights match.";
  return div;
}

function download(text, name) {
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([text], { type: "application/json" })), download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function esc(s = "") {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function short(url) {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`.slice(0, 92);
  } catch { return url; }
}

function host(url) {
  try { return new URL(url).hostname; }
  catch { return "Saved page"; }
}
