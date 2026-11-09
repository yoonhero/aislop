(() => {
  const key = "pastelPen.highlights.v1";
  const articleKey = (url) => "pastelPen.article:" + url;
  const colors = [
    ["Lemon", "#fff176"], ["Mint", "#b8f7d4"], ["Peach", "#ffc6a8"],
    ["Rose", "#ffb7cf"], ["Sky", "#bfe4ff"], ["Lilac", "#d9c7ff"]
  ];
  function colorIndex(color) {
    return Math.max(0, colors.findIndex((entry) => entry[1] === color));
  }
  function read(raw) {
    return {
      prefs: PastelPenScope.normalizePrefs(raw?.prefs),
      items: Array.isArray(raw?.items) ? raw.items.filter((item) =>
        typeof item?.id === "string" && typeof item.url === "string" && /^(https?:\/\/|file:\/\/)/.test(item.url) && PastelPenScope.cleanPage(item.url) &&
        typeof item.exact === "string" && item.exact.length > 0
      ) : []
    };
  }
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  globalThis.PastelPen = { key, articleKey, colors, colorIndex, read, element };
})();
