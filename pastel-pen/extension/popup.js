const { key, read, colors, colorIndex, element: el } = PastelPen;
const S = PastelPenScope;
const $ = (id) => document.getElementById(id);
const write = (action, value) => browser.runtime.sendMessage({ type: "pastel-write", action, value });

async function boot() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const url = S.cleanPage(tab?.url);
  let data = read((await browser.storage.local.get(key))[key]);
  const scope = $("scope");
  const toggle = $("toggle");
  const swatches = colors.map(([name, color]) => {
    const b = el("button");
    b.type = "button";
    b.style.background = color;
    b.title = name;
    b.ariaLabel = name;
    b.onclick = async () => {
      data = read(await write("color", color));
      render();
    };
    return b;
  });
  $("colors").append(...swatches);
  function render() {
    const enabled = url && S.scopeValue(data.prefs, scope.value, url);
    const rule = url && S.resolve(data.prefs, url);
    toggle.textContent = enabled ? "Pen on" : "Pen off";
    toggle.ariaPressed = String(Boolean(enabled));
    $("scopeHint").textContent = rule?.scope === "page" && scope.value !== "page" ? "The page rule takes precedence here." : "";
    swatches.forEach((b, i) => { b.ariaPressed = String(i === colorIndex(data.prefs.color)); });
  }
  $("pageLabel").textContent = url ? (new URL(url).hostname || "Local file") : "Protected browser page";
  scope.disabled = toggle.disabled = !url;
  scope.onchange = render;
  toggle.onclick = async () => {
    data = read(await write("scope", { scope: scope.value, url, enabled: toggle.ariaPressed !== "true" }));
    render();
  };
  $("review").onclick = () => browser.runtime.sendMessage({ type: "PASTEL_PEN_OPEN_REVIEW" });
  render();
}
boot().catch(console.warn);
