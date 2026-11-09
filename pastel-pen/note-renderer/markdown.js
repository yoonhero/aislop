import MarkdownIt from "markdown-it";
import { tex } from "@mdit/plugin-tex";

const markdown = new MarkdownIt({ html: false, breaks: true }).use(tex, {
  delimiters: "all",
  mathFence: true,
  render(source, display, env) {
    const index = env.equations.push({ source, display }) - 1;
    return '<span data-pastel-equation="' + index + '"></span>';
  }
});

const safeLink = markdown.validateLink;
markdown.validateLink = (url) => /^https?:\/\//i.test(url) && safeLink(url);
markdown.renderer.rules.link_open = (tokens, index, options, env, renderer) => {
  tokens[index].attrSet("target", "_blank");
  tokens[index].attrSet("rel", "noopener noreferrer");
  return renderer.renderToken(tokens, index, options);
};
markdown.renderer.rules.image = (tokens, index, options, env, renderer) =>
  markdown.utils.escapeHtml(renderer.renderInlineAsText(tokens[index].children, options, env));

export function renderMarkdown(source) {
  const equations = [];
  return { html: markdown.render(source, { equations }), equations };
}
