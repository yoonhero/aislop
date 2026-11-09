(() => {
  const { element: el, colors, colorIndex } = PastelPen;

  function create(jump) {
    const rail = el("div", "highlight-track");
    rail.hidden = true;
    const input = el("input", "page-scrollbar");
    input.type = "range";
    input.min = 0;
    input.step = "any";
    input.setAttribute("role", "scrollbar");
    input.ariaLabel = "Scroll page";
    input.ariaOrientation = "vertical";
    input.ariaControlsElements = [document.scrollingElement];
    const markers = el("nav", "highlight-markers");
    markers.ariaLabel = "Highlight locations";
    const choices = el("div", "marker-choices");
    choices.hidden = true;
    choices.setAttribute("role", "group");
    choices.ariaLabel = "Highlights at this position";
    rail.append(input, markers, choices);

    const scroll = (top) => scrollTo({ top, behavior: "instant" });
    input.oninput = () => scroll(input.valueAsNumber);
    input.onkeydown = (event) => {
      const jumps = {
        ArrowUp: -40, ArrowDown: 40, PageUp: -innerHeight, PageDown: innerHeight,
        Home: -scrollY, End: Number(input.max) - scrollY,
        " ": event.shiftKey ? -innerHeight : innerHeight
      };
      if (!Object.hasOwn(jumps, event.key)) return;
      event.preventDefault();
      scroll(scrollY + jumps[event.key]);
    };

    let openMarker;
    let signature;
    let bands = [];
    const label = ({ item }) => (item.quote || item.exact).slice(0, 100);

    function close(restoreFocus = false) {
      if (!openMarker) return false;
      openMarker.ariaExpanded = "false";
      if (restoreFocus) openMarker.focus({ preventScroll: true });
      openMarker = null;
      choices.hidden = true;
      return true;
    }

    function update(enabled, documentHeight, viewportHeight, highlights) {
      rail.hidden = !enabled;
      if (!enabled) return close();
      const limit = documentHeight - viewportHeight;
      const position = Math.max(0, Math.min(limit, scrollY));
      const percent = String(Math.round(position / limit * 100));
      input.max = limit;
      input.valueAsNumber = position;
      input.ariaValueNow = percent;
      input.ariaValueText = percent + "%";
      input.style.setProperty("--thumb-size", Math.max(32, input.clientHeight * viewportHeight / documentHeight) + "px");

      const height = markers.clientHeight;
      const offset = (top) => Math.round(Math.max(0, Math.min(height, top / documentHeight * height)));
      const ordered = highlights.filter(({ documentTop }) => documentTop !== null)
        .map((entry) => ({ entry, start: offset(entry.documentTop), end: offset(entry.documentBottom) }))
        .sort((a, b) => a.start - b.start);
      const next = JSON.stringify([height, ordered.map(({ entry, start, end }) =>
        [entry.item.id, entry.item.color, start, end, label(entry)])]);
      if (next !== signature) {
        signature = next;
        close();
        bands = [];
        for (const span of ordered) {
          const top = Math.max(0, Math.min(height - 16, span.start - 6));
          const bottom = Math.min(height, Math.max(top + 16, span.end + 6));
          const last = bands.at(-1);
          if (last && top <= last.bottom + 2) {
            last.bottom = Math.max(bottom, last.bottom);
            last.spans.push(span);
          } else bands.push({ top, bottom, spans: [span] });
        }
        markers.replaceChildren(...bands.map((band) => {
          const { top, bottom, spans } = band;
          const marker = el("button", "highlight-marker");
          marker.type = "button";
          marker.style.top = top + "px";
          marker.style.height = bottom - top + "px";
          marker.title = marker.ariaLabel = spans.length === 1
            ? "Jump to highlight: " + label(spans[0].entry)
            : spans.length + " nearby highlights";
          if (spans.length > 1) marker.ariaExpanded = "false";
          for (const { entry, start, end } of spans) {
            const line = el("span", "marker-line");
            line.style.top = Math.min(bottom - top - 4, Math.max(0, start - top)) + "px";
            line.style.height = Math.max(4, end - start) + "px";
            line.style.setProperty("--tint", colors[colorIndex(entry.item.color)][1]);
            marker.append(line);
          }
          marker.onclick = () => {
            if (spans.length === 1) return jump(spans[0].entry.item.id);
            if (openMarker === marker) return close(true);
            close();
            openMarker = marker;
            marker.ariaExpanded = "true";
            choices.replaceChildren(...spans.map(({ entry }) => {
              const choice = el("button", "", label(entry));
              choice.type = "button";
              choice.onclick = () => {
                close(true);
                jump(entry.item.id);
              };
              return choice;
            }));
            choices.hidden = false;
            choices.style.top = Math.max(0, Math.min(top, rail.clientHeight - choices.offsetHeight)) + "px";
            choices.firstElementChild.focus({ preventScroll: true });
          };
          band.marker = marker;
          return marker;
        }));
      }
      for (const { marker, spans } of bands) {
        marker.classList.toggle("in-view", spans.some(({ start, end }) =>
          end >= offset(position) && start < offset(position + viewportHeight)));
      }
    }
    return { rail, update, close };
  }

  globalThis.PastelScrollbar = { create };
})();
