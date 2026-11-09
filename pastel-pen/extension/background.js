const api = browser;
const { key, articleKey, read, colors, colorIndex } = PastelPen;
let writes = Promise.resolve();

api.runtime.onInstalled.addListener(() => {
  api.menus.create({ id: "pastel-pen-highlight", title: "Highlight with HiBulb", contexts: ["selection"] });
  api.menus.create({ id: "pastel-pen-toggle-page", title: "Toggle HiBulb on this page", contexts: ["page"] });
});

api.menus.onClicked.addListener((info, tab) => {
  const type = info.menuItemId === "pastel-pen-highlight" ? "highlight" : "toggle";
  return api.tabs.sendMessage(tab.id, { type }).catch(console.warn);
});

api.runtime.onMessage.addListener((message, sender) => {
  if (message?.type === "PASTEL_PEN_OPEN_REVIEW") {
    const url = new URL(api.runtime.getURL("review.html"));
    if (message.id) url.searchParams.set("id", message.id);
    if (message.source) url.searchParams.set("source", message.source);
    return api.tabs.create({ url: url.href });
  }
  if (message?.type !== "pastel-write") return;
  const task = writes.then(async () => {
    const data = read((await api.storage.local.get(key))[key]);
    const { action, id, value } = message;
    const privileged = sender.url?.startsWith(api.runtime.getURL(""));
    const items = data.items.filter((item) => privileged || item.url === PastelPenScope.cleanPage(sender.url));
    const item = items.find((entry) => entry.id === id);
    switch (action) {
      case "add":
        if (value.url === PastelPenScope.cleanPage(sender.url) && !data.items.some((entry) => entry.id === value.id)) {
          data.items.unshift(value);
          data.prefs.color = value.color;
        }
        break;
      case "note":
        if (item) item.note = String(value).slice(0, 4000);
        break;
      case "fold":
      case "notebookFolded":
        if (item) item[action === "fold" ? "folded" : action] = Boolean(value);
        break;
      case "placement":
      case "notebookPlacement":
        if (item && value && ["x", "y", "w", "h"].every((field) => Number.isFinite(value[field]))) item[action] = value;
        break;
      case "remove":
        if (item) data.items = data.items.filter((entry) => entry !== item);
        break;
      case "color": {
        const color = colors[colorIndex(value)][1];
        if (item) {
          item.paper ??= item.color;
          item.color = color;
        } else if (!id) data.prefs.color = color;
        break;
      }
      case "scope":
        data.prefs = PastelPenScope.setScope(data.prefs, value.scope, value.url, value.enabled);
        if (value.scope === "domain" && value.inheritPage) delete data.prefs.scopeRules.page[PastelPenScope.cleanPage(value.url)];
        break;
      case "import":
        if (privileged) {
          const incoming = read(value);
          const itemsById = new Map([...data.items, ...incoming.items].map((entry) => [entry.id, entry]));
          data.items = [...itemsById.values()];
        }
        break;
    }
    await api.storage.local.set({ [key]: data });
    if (action === "remove" && item && !data.items.some((entry) => entry.url === item.url)) {
      await api.storage.local.remove(articleKey(item.url));
    }
    return data;
  });
  writes = task.catch(console.warn);
  return task;
});
