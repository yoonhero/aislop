const api = globalThis.browser || globalThis.chrome;

api.runtime.onInstalled.addListener(() => {
  api.menus.create({
    id: "pastel-pen-highlight",
    title: "Highlight with Pastel Pen",
    contexts: ["selection"]
  });
  api.menus.create({
    id: "pastel-pen-review",
    title: "Open Pastel Pen Review",
    contexts: ["browser_action", "page", "selection"]
  });
  api.menus.create({
    id: "pastel-pen-toggle-page",
    title: "Toggle Pastel Pen on this page",
    contexts: ["page", "selection"]
  });
});

api.menus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "pastel-pen-review") return openReview();
  if (info.menuItemId === "pastel-pen-toggle-page" && tab?.id) {
    api.tabs.sendMessage(tab.id, { type: "PASTEL_PEN_TOGGLE_PAGE" });
    return;
  }
  if (info.menuItemId === "pastel-pen-highlight" && tab?.id) {
    api.tabs.sendMessage(tab.id, { type: "PASTEL_PEN_HIGHLIGHT_CONTEXT" });
  }
});

api.runtime.onMessage.addListener((message) => {
  if (message?.type === "PASTEL_PEN_OPEN_REVIEW") openReview(message.q);
});

function openReview(q = "") {
  api.tabs.create({ url: api.runtime.getURL(`review.html${q ? `?q=${encodeURIComponent(q)}` : ""}`) });
}
