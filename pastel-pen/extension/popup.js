const api = globalThis.browser || globalThis.chrome;
const KEY = "pastelPen.highlights.v1";
const COLORS = [
  ["lemon", "#fff176"], ["mint", "#b8f7d4"], ["peach", "#ffc6a8"],
  ["rose", "#ffb7cf"], ["sky", "#bfe4ff"], ["lilac", "#d9c7ff"]
];

boot();

async function boot() {
  const data = normalize((await api.storage.local.get(KEY))[KEY]);
  const tab = (await api.tabs.query({ active: true, currentWindow: true }))[0];
  const page = cleanPage(tab?.url);
  let enabled = page ? data.prefs.disabledPages?.[page] !== true : false;
  try {
    if (tab?.id) {
      const remote = await api.tabs.sendMessage(tab.id, { type: "PASTEL_PEN_GET_PAGE_STATE" });
      if (typeof remote?.enabled === "boolean") enabled = remote.enabled;
    }
  } catch { /* restricted pages use the stored fallback */ }

  count.textContent = data.items.length;
  pageLabel.textContent = page ? displayPage(page) : "Firefox’s protected page";
  renderToggle(enabled);
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
  pageToggle.onclick = async () => {
    enabled = !enabled;
    data.prefs.disabledPages = { ...(data.prefs.disabledPages || {}) };
    if (page) data.prefs.disabledPages[page] = !enabled;
    await api.storage.local.set({ [KEY]: data });
    try { if (tab?.id) await api.tabs.sendMessage(tab.id, { type: "PASTEL_PEN_SET_PAGE_STATE", enabled }); } catch { /* protected pages */ }
    renderToggle(enabled);
  };
  review.onclick = () => api.runtime.sendMessage({ type: "PASTEL_PEN_OPEN_REVIEW" });
}

function normalize(raw) {
  const data = raw && typeof raw === "object" ? raw : {};
  return {
    items: Array.isArray(data.items) ? data.items : [],
    prefs: { ...(data.prefs || {}), disabledPages: { ...(data.prefs?.disabledPages || {}) } }
  };
}

function renderToggle(enabled) {
  pageToggle.classList.toggle("is-off", !enabled);
  pageToggle.setAttribute("aria-pressed", String(enabled));
  toggleTitle.textContent = enabled ? "Highlighting on" : "Highlighting off";
  toggleHint.textContent = enabled ? "New and saved marks are visible." : "Marks stay saved, but this page is quiet.";
}

function cleanPage(url = "") {
  try { const u = new URL(url); u.hash = ""; return /^(https?:|file:)$/.test(u.protocol) ? u.href : ""; }
  catch { return ""; }
}

function displayPage(url) {
  try { const u = new URL(url); return `${u.hostname}${u.pathname}`.replace(/\/$/, "") || u.hostname; }
  catch { return url; }
}
