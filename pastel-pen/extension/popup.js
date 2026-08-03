const api = globalThis.browser || globalThis.chrome;
const KEY = "pastelPen.highlights.v1";
const SCOPE = globalThis.PastelPenScope;
const scopeSelect = document.getElementById("scopeSelect");
const scopeHint = document.getElementById("scopeHint");
const COLORS = [
  ["lemon", "#fff176"], ["mint", "#b8f7d4"], ["peach", "#ffc6a8"],
  ["rose", "#ffb7cf"], ["sky", "#bfe4ff"], ["lilac", "#d9c7ff"]
];

boot();

async function boot() {
  const data = normalize((await api.storage.local.get(KEY))[KEY]);
  const tab = (await api.tabs.query({ active: true, currentWindow: true }))[0];
  const page = SCOPE.cleanPage(tab?.url);
  let selectedScope = "page";
  let enabled = page ? SCOPE.scopeValue(data.prefs, selectedScope, page) : false;
  try {
    if (tab?.id) {
      const remote = await api.tabs.sendMessage(tab.id, { type: "PASTEL_PEN_GET_PAGE_STATE" });
      if (typeof remote?.enabled === "boolean") enabled = remote.enabled;
    }
  } catch { /* restricted pages use the stored fallback */ }

  count.textContent = data.items.length;
  pageLabel.textContent = page ? displayPage(page) : "Firefox’s protected page";
  renderScope(page, data.prefs, selectedScope, enabled);
  colors.replaceChildren(...COLORS.map(([name, color]) => {
    const b = document.createElement("button");
    b.title = name;
    b.ariaLabel = `Use ${name}`;
    b.dataset.color = color;
    b.style.background = color;
    b.ariaPressed = String(color === (data.prefs.color || COLORS[0][1]));
    return b;
  }));
  colors.onclick = async (e) => {
    const color = e.target.dataset.color;
    if (!color) return;
    data.prefs.color = color;
    await api.storage.local.set({ [KEY]: data });
    colors.querySelectorAll("button").forEach((b) => { b.ariaPressed = String(b.dataset.color === color); });
    window.close();
  };
  scopeSelect.onchange = () => {
    selectedScope = scopeSelect.value;
    enabled = page ? SCOPE.scopeValue(data.prefs, selectedScope, page) : false;
    renderScope(page, data.prefs, selectedScope, enabled);
  };
  pageToggle.onclick = async () => {
    enabled = !enabled;
    if (!page) return;
    data.prefs = SCOPE.setScope(data.prefs, selectedScope, page, enabled);
    await api.storage.local.set({ [KEY]: data });
    try {
      if (tab?.id) await api.tabs.sendMessage(tab.id, { type: "PASTEL_PEN_SET_SCOPE_STATE", scope: selectedScope, enabled });
    } catch { /* protected pages use the stored rule */ }
    renderScope(page, data.prefs, selectedScope, enabled);
  };
  review.onclick = () => api.runtime.sendMessage({ type: "PASTEL_PEN_OPEN_REVIEW" });
}

function normalize(raw) {
  const data = raw && typeof raw === "object" ? raw : {};
  return {
    items: Array.isArray(data.items) ? data.items : [],
    prefs: SCOPE.normalizePrefs(data.prefs)
  };
}

function renderScope(page, prefs, scope, enabled) {
  scopeSelect.value = scope;
  scopeSelect.disabled = !page;
  pageToggle.disabled = !page;
  scopeHint.textContent = describeScope(page, prefs, scope);
  renderToggle(enabled, scope);
}

function renderToggle(enabled, scope) {
  pageToggle.classList.toggle("is-off", !enabled);
  pageToggle.setAttribute("aria-pressed", String(enabled));
  toggleTitle.textContent = `${scopeLabel(scope)}: ${enabled ? "on" : "off"}`;
  toggleHint.textContent = enabled ? "New and saved marks follow this scope." : "This scope is quiet; narrower rules may still override it.";
}

function describeScope(page, prefs, scope) {
  if (!page) return "Protected browser pages cannot be highlighted.";
  const u = new URL(page);
  const path = u.pathname.replace(/\/$/, "") || "/";
  const source = SCOPE.resolve(prefs, page);
  const base = scope === "page"
    ? "Only this exact URL."
    : scope === "path"
      ? `${u.hostname}${path} and everything below it.`
      : `${u.hostname} across every path.`;
  if (source.scope === "default") return `${base} Falls back to the default: off.`;
  if (source.scope !== scope) return `${base} A ${scopeLabel(source.scope).toLowerCase()} rule currently wins here.`;
  return base;
}

function scopeLabel(scope) {
  return { page: "This page", path: "This path", domain: "This domain" }[scope] || "This page";
}

function displayPage(url) {
  try { const u = new URL(url); return `${u.hostname}${u.pathname}`.replace(/\/$/, "") || u.hostname; }
  catch { return url; }
}
