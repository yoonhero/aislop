import katex from "katex";

export function renderMath({ source, display }) {
  const html = katex.renderToString(source, {
    displayMode: display,
    output: "mathml",
    throwOnError: false,
    trust: false,
    strict: "ignore",
    maxExpand: 300,
    maxSize: 12
  });
  return display ? '<div class="note-math-block">' + html + '</div>' : html;
}
