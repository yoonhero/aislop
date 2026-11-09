(() => {
  const math = "d-math, .katex, mjx-container, .MathJax, .MathJax_SVG, .MathJax_CHTML, .mwe-math-element, .ltx_Math, math, [role='math'], img.latex, img.math";
  const atomic = math + ", d-footnote, d-cite";
  const omit = "script,style,noscript,textarea,input,select,iframe,[hidden],.MathJax_Preview,.mwe-math-mathml-inline,.mwe-math-mathml-display,mjx-assistive-mml,[contenteditable]:not([contenteditable='false']),#pastel-pen";
  const clean = (value) => value.replace(/\s+/g, " ").trim();

  function formula(node) {
    const rendered = node.shadowRoot || node;
    if (node.matches("d-footnote,d-cite")) return clean(rendered.querySelector("sup")?.textContent || "") || "†";
    return clean(rendered.querySelector("annotation[encoding='application/x-tex']")?.textContent ||
      node.getAttribute("aria-label") || node.getAttribute("alttext") ||
      node.getAttribute("alt") || node.querySelector("mjx-assistive-mml math")?.textContent ||
      node.textContent || "") || "Equation";
  }

  function index() {
    const parts = [];
    let text = "";
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
          return node.length && !node.parentElement.closest(atomic) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
        if (node.parentElement.closest(atomic)) return NodeFilter.FILTER_REJECT;
        if (node.matches(omit) || getComputedStyle(node).display === "none") return NodeFilter.FILTER_REJECT;
        if (node.matches(atomic)) return NodeFilter.FILTER_ACCEPT;
        return NodeFilter.FILTER_SKIP;
      }
    });
    for (let node; (node = walker.nextNode());) {
      const atomic = node.nodeType === Node.ELEMENT_NODE;
      const value = atomic ? '\ufffc' + formula(node) + '\ufffc' : node.data;
      parts.push({ node, atomic, start: text.length, end: text.length + value.length });
      text += value;
    }
    return { text, parts };
  }

  function atomAt(node) {
    const element = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    let outer = element?.closest?.(atomic);
    if (!outer) return null;
    for (let parent; (parent = outer.parentElement?.closest(atomic));) outer = parent;
    return outer;
  }

  function extendToAtoms(range, nodes) {
    for (const equation of new Set(nodes.map(atomAt).filter(Boolean))) {
      const bounds = document.createRange();
      bounds.selectNode(equation);
      if (range.compareBoundaryPoints(Range.START_TO_START, bounds) > 0) range.setStartBefore(equation);
      if (range.compareBoundaryPoints(Range.END_TO_END, bounds) < 0) range.setEndAfter(equation);
    }
  }

  function selected(range, { parts }) {
    let start = null;
    let end = null;
    for (const part of parts) {
      const { node, atomic } = part;
      if (!range.intersectsNode(node)) continue;
      const first = part.start + (!atomic && node === range.startContainer ? range.startOffset : 0);
      const last = !atomic && node === range.endContainer ? part.start + range.endOffset : part.end;
      if (first >= last) continue;
      start ??= first;
      end = last;
    }
    return start === null ? null : { start, end };
  }

  function locate(item, { text }) {
    if (text.slice(item.start, item.end) === item.exact &&
        text.slice(Math.max(0, item.start - 80), item.start) === item.prefix &&
        text.slice(item.end, item.end + 80) === item.suffix) return item;
    const hits = [];
    for (let i = text.indexOf(item.exact); i !== -1; i = text.indexOf(item.exact, i + 1)) {
      const end = i + item.exact.length;
      const score = Number(clean(text.slice(Math.max(0, i - 80), i)) === item.prefix ||
        text.slice(Math.max(0, i - 80), i) === item.prefix) +
        Number(clean(text.slice(end, end + 80)) === item.suffix || text.slice(end, end + 80) === item.suffix);
      hits.push({ start: i, end, score });
    }
    hits.sort((a, b) => b.score - a.score);
    if (hits.length === 1 || (hits.length > 1 && hits[0].score > hits[1].score)) return hits[0];
    return null;
  }

  function geometry({ start, end }, { parts }) {
    const formulas = [];
    const ranges = [];
    let run = null;
    // Split runs at equations so CSS Highlights never paints hidden math internals.
    for (const part of parts) {
      if (part.start >= end) break;
      if (part.end <= start) continue;
      if (part.atomic) {
        formulas.push(part.node);
        run = null;
        continue;
      }
      if (!run) {
        run = document.createRange();
        run.setStart(part.node, Math.max(0, start - part.start));
        ranges.push(run);
      }
      run.setEnd(part.node, Math.min(part.end, end) - part.start);
    }
    return { ranges, formulas };
  }

  function atomRects(node) {
    const rendered = node.shadowRoot || node;
    if (node.matches("d-footnote,d-cite")) return [...(rendered.querySelector("sup") || node).getClientRects()];
    const katex = rendered.querySelector(".katex-html");
    const bases = katex && [...katex.querySelectorAll(".base")];
    if (bases?.length) return bases.flatMap((base) => [...base.getClientRects()]);
    const visual = [...rendered.querySelectorAll("svg, img")].find((element) => element.getClientRects().length &&
      getComputedStyle(element).visibility === "visible");
    if (visual) return [...visual.getClientRects()];
    const mathNode = node.matches("math") ? node : rendered.querySelector("math");
    const rectangles = [...(katex || node).getClientRects()];
    if (mathNode && !katex && mathNode.getClientRects().length) {
      const range = document.createRange();
      range.selectNodeContents(mathNode);
      const ink = [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0);
      if (ink.length) {
        const all = [...rectangles, ...ink];
        const left = Math.min(...all.map((rect) => rect.left));
        const top = Math.min(...all.map((rect) => rect.top));
        const right = Math.max(...all.map((rect) => rect.right));
        const bottom = Math.max(...all.map((rect) => rect.bottom));
        return [new DOMRect(left, top, right - left, bottom - top)];
      }
    }
    return rectangles;
  }

  function mathTree(node, depth = 0) {
    if (depth > 30) return null;
    if (node.nodeType === Node.TEXT_NODE) return node.data;
    if (node.namespaceURI !== "http://www.w3.org/1998/Math/MathML" ||
        ["annotation", "annotation-xml"].includes(node.localName)) return null;
    const children = [...node.childNodes].map((child) => mathTree(child, depth + 1)).filter(Boolean);
    return node.localName === "semantics" ? children[0] : [node.localName, ...children];
  }

  function context(index, { start, end }) {
    const { parts } = index;
    const blocks = [];
    let current;
    for (const part of parts) {
      if (part.start >= end + 650) break;
      if (part.end <= start - 650) continue;
      const parent = part.atomic ? part.node : part.node.parentElement;
      const block = parent.closest("p,li,h1,h2,h3,h4,h5,h6,blockquote,pre,figcaption,td,div,section,article");
      const value = part.atomic ? formula(part.node) : part.node.data;
      const append = (text, marked) => {
        if (!text) return;
        if (!current || current.block !== block) {
          current = { block, chunks: [] };
          blocks.push(current);
        }
        const native = part.atomic && (parent.matches("math") ? parent : (parent.shadowRoot || parent).querySelector("math"));
        current.chunks.push({ text, marked, math: native ? mathTree(native) : part.atomic && parent.matches(math), sup: parent.matches("d-footnote,d-cite,sup") });
      };
      if (part.atomic) {
        append(value, part.end > start && part.start < end);
        continue;
      }
      const a = Math.max(0, start - part.start);
      const b = Math.max(0, end - part.start);
      const low = Math.max(0, start - 650 - part.start);
      const high = Math.min(value.length, end + 650 - part.start);
      append(value.slice(low, Math.min(a, high)), false);
      append(value.slice(Math.max(low, a), Math.min(b, high)), true);
      append(value.slice(Math.max(low, b), high), false);
    }
    return blocks.map(({ chunks }) => chunks).filter((chunks) => chunks.some((chunk) => clean(chunk.text)));
  }

  function article(index, root) {
    const blocks = [];
    let previous;
    const selector = "h1,h2,h3,h4,h5,h6,p,li,blockquote,pre,figcaption,td,d-math[block]";
    for (const part of index.parts) {
      if (!root.contains(part.node)) continue;
      const parent = part.atomic ? part.node : part.node.parentElement;
      const block = parent.closest(selector);
      if (!block || !root.contains(block)) continue;
      const text = part.atomic ? formula(parent) : part.node.data;
      const native = part.atomic && (parent.matches("math") ? parent : (parent.shadowRoot || parent).querySelector("math"));
      if (block !== previous) {
        blocks.push({ tag: block.localName, chunks: [] });
        previous = block;
      }
      const inline = parent.closest("sup,sub,em,strong,b,i,code,d-footnote,d-cite")?.localName;
      blocks.at(-1).chunks.push({ start: part.start, end: part.end, text,
        inline: inline?.startsWith("d-") ? "sup" : inline,
        atomic: part.atomic, math: native ? mathTree(native) : part.atomic && parent.matches(math) });
    }
    const readable = blocks.filter(({ chunks }) => chunks.some((chunk) => clean(chunk.text)));
    const offset = readable[0]?.chunks[0].start ?? 0;
    const end = readable.at(-1)?.chunks.at(-1).end ?? 0;
    return { text: index.text.slice(offset, end), offset, blocks: readable };
  }

  globalThis.PastelAnchors = { index, selected, locate, geometry, context, article, clean, atomAt, extendToAtoms, atomRects };
})();
