const api = globalThis.browser || globalThis.chrome;
const KEY = "pastelPen.highlights.v1";
const COLORS = [
  ["lemon", "#fff176"], ["mint", "#b8f7d4"], ["peach", "#ffc6a8"],
  ["rose", "#ffb7cf"], ["sky", "#bfe4ff"], ["lilac", "#d9c7ff"]
];

boot();

async function boot() {
  const data = (await api.storage.local.get(KEY))[KEY] || { items: [], prefs: {} };
  count.textContent = data.items?.length || 0;
  colors.replaceChildren(...COLORS.map(([name, color]) => {
    const b = document.createElement("button");
    b.title = name;
    b.dataset.color = color;
    b.style.background = color;
    return b;
  }));
  colors.onclick = async (e) => {
    const color = e.target.dataset.color;
    if (!color) return;
    await api.storage.local.set({ [KEY]: { ...data, prefs: { ...(data.prefs || {}), color } } });
    window.close();
  };
  review.onclick = () => api.runtime.sendMessage({ type: "PASTEL_PEN_OPEN_REVIEW" });
}
