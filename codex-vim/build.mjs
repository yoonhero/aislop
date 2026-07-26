import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const M = "aislop_codex_vim_mode";
const V = "aislop_codex_vim_visual";
const O = "aislop_codex_vim_operator";
const P = "aislop_codex_vim_prefix";
const F = "aislop_codex_vim_textarea";
const R = "aislop_codex_vim_right_in_line";
const S = "aislop_codex_vim_shift";

const app = {
  type: "frontmost_application_if",
  bundle_identifiers: ["^com\\.openai\\.codex$"],
};
const is = (name, value) => ({ type: "variable_if", name, value });
const key = (key_code, modifiers = []) =>
  modifiers.length ? { key_code, modifiers } : { key_code };
const from = (key_code, mandatory = [], optional = ["caps_lock"]) => ({
  key_code,
  modifiers: {
    ...(mandatory.length ? { mandatory } : {}),
    optional,
  },
});
const motionFrom = (key_code, mandatory) =>
  from(key_code, mandatory, mandatory.length ? ["any"] : ["caps_lock"]);
const set = (name, value) => ({ set_variable: { name, value } });
const badge = (text) => ({
  set_notification_message: { id: "aislop_codex_vim", text },
});
const cursor = (mode) => ({
  shell_command: `/bin/echo ${mode} > /tmp/aislop-codex-vim-mode`,
});
const bind = (source, to, conditions) => ({
  type: "basic",
  conditions,
  from: source,
  to,
});

const focused = [app, is(F, 1)];
const base = [...focused, is(M, 1), is(V, 0)];
const normal = [...base, is(O, ""), is(P, "")];
const visual = [...focused, is(M, 1), is(V, 1)];
const op = (operator, prefix = "") => [
  ...base,
  is(O, operator),
  is(P, prefix),
];
const prefixed = (prefix) => [...base, is(O, ""), is(P, prefix)];
const reset = [set(O, ""), set(P, "")];
const enterInsert = [
  set(M, 0),
  set(V, 0),
  set(S, 0),
  ...reset,
  cursor("insert"),
  badge(""),
];
const enterNormal = [
  set(M, 1),
  set(V, 0),
  set(S, 0),
  ...reset,
  cursor("normal"),
  badge("Codex Vim  ·  NORMAL"),
];
const select = (events) =>
  events.map((event) =>
    event.key_code
      ? key(event.key_code, [...(event.modifiers ?? []), "shift"])
      : event,
  );
const finish = (operator) => ({
  d: [
    key("delete_or_backspace"),
    ...reset,
    cursor("normal"),
    badge("Codex Vim  ·  NORMAL"),
  ],
  c: [key("delete_or_backspace"), ...enterInsert],
  y: [
    key("c", ["command"]),
    key("left_arrow"),
    ...reset,
    cursor("normal"),
    badge("Codex Vim  ·  NORMAL"),
  ],
})[operator];

const motions = [
  ["h", [], [key("left_arrow")]],
  ["j", [], [key("down_arrow")]],
  ["k", [], [key("up_arrow")]],
  ["l", [], [key("right_arrow")]],
  ["w", [], [key("right_arrow", ["option"])]],
  ["e", [], [key("right_arrow", ["option"])]],
  ["b", [], [key("left_arrow", ["option"])]],
  ["0", [], [key("left_arrow", ["command"])]],
  ["4", ["shift"], [key("right_arrow", ["command"])]],
  ["g", ["shift"], [key("down_arrow", ["command"])]],
];
const operatorMotions = motions.filter(([name]) => !["j", "k"].includes(name));
const line = [
  key("left_arrow", ["command"]),
  key("right_arrow", ["command", "shift"]),
  key("right_arrow", ["shift"]),
];

const abstractManipulators = [
  bind(from("escape", ["control"]), enterInsert, focused),
  bind(from("escape"), enterNormal, focused),
  ...["left_shift", "right_shift"].map((side) => ({
    type: "basic",
    conditions: base,
    from: from(side, [], ["any"]),
    to: [set(S, 1)],
    to_after_key_up: [set(S, 0)],
  })),

  bind(
    from("y"),
    [
      key("c", ["command"]),
      key("left_arrow"),
      set(V, 0),
      cursor("normal"),
      badge("Codex Vim  ·  NORMAL"),
    ],
    visual,
  ),
  bind(
    from("d"),
    [
      key("delete_or_backspace"),
      set(V, 0),
      cursor("normal"),
      badge("Codex Vim  ·  NORMAL"),
    ],
    visual,
  ),
  bind(from("c"), [key("delete_or_backspace"), ...enterInsert], visual),
  ...motions.map(([name, modifiers, events]) =>
    bind(motionFrom(name, modifiers), select(events), visual),
  ),

  ...["d", "c", "y"].flatMap((operator) => [
    bind(from(operator), [...line, ...finish(operator)], op(operator)),
    bind(
      from("g", ["shift"]),
      [
        key("down_arrow", ["command", "shift"]),
        ...finish(operator),
      ],
      op(operator),
    ),
    bind(
      from("g"),
      [
        set(P, "g"),
        badge(`Codex Vim  ·  ${operator}g…`),
      ],
      op(operator),
    ),
    bind(
      from("g"),
      [
        key("up_arrow", ["command", "shift"]),
        ...finish(operator),
      ],
      op(operator, "g"),
    ),
    ...operatorMotions.map(([name, modifiers, events]) =>
      bind(
        motionFrom(name, modifiers),
        [...select(events), ...finish(operator)],
        op(operator),
      ),
    ),
    ...["i", "a"].flatMap((scope) => [
      bind(
        from(scope),
        [
          set(P, scope),
          badge(`Codex Vim  ·  ${operator}${scope}…`),
        ],
        op(operator),
      ),
      bind(
        from("w"),
        [
          key("left_arrow", ["option"]),
          key("right_arrow", ["option", "shift"]),
          ...(scope === "a" ? [key("right_arrow", ["shift"])] : []),
          ...finish(operator),
        ],
        op(operator, scope),
      ),
    ]),
  ]),

  bind(
    from("i", [], ["any"]),
    [key("left_arrow", ["command"]), ...enterInsert],
    [...base, is(S, 1)],
  ),
  bind(
    from("4", [], ["any"]),
    [
      key("right_arrow", ["command"]),
      set(S, 0),
      ...reset,
      badge("Codex Vim  ·  NORMAL"),
    ],
    [...base, is(S, 1)],
  ),
  bind(
    from("g", [], ["any"]),
    [
      key("down_arrow", ["command"]),
      set(S, 0),
      ...reset,
      badge("Codex Vim  ·  NORMAL"),
    ],
    [...base, is(S, 1)],
  ),

  ...["d", "c", "y"].map((operator) =>
    bind(
      from(operator),
      [
        set(O, operator),
        badge(`Codex Vim  ·  ${operator}…`),
      ],
      normal,
    ),
  ),

  bind(
    from("g"),
    [set(P, "g"), badge("Codex Vim  ·  g…")],
    normal,
  ),
  bind(
    from("g"),
    [
      key("up_arrow", ["command"]),
      set(P, ""),
      badge("Codex Vim  ·  NORMAL"),
    ],
    prefixed("g"),
  ),

  bind(
    motionFrom("i", ["shift"]),
    [key("left_arrow", ["command"]), ...enterInsert],
    base,
  ),
  bind(
    motionFrom("a", ["shift"]),
    [key("right_arrow", ["command"]), ...enterInsert],
    base,
  ),
  bind(
    motionFrom("o", ["shift"]),
    [
      key("left_arrow", ["command"]),
      key("return_or_enter", ["shift"]),
      key("up_arrow"),
      ...enterInsert,
    ],
    base,
  ),
  bind(from("i"), enterInsert, normal),
  bind(
    from("a"),
    [key("right_arrow"), ...enterInsert],
    [...normal, is(R, 1)],
  ),
  bind(from("a"), enterInsert, [...normal, is(R, 0)]),
  bind(
    from("o"),
    [
      key("right_arrow", ["command"]),
      key("return_or_enter", ["shift"]),
      ...enterInsert,
    ],
    normal,
  ),
  bind(
    from("v"),
    [set(V, 1), cursor("visual"), badge("Codex Vim  ·  VISUAL")],
    normal,
  ),
  ...motions.map(([name, modifiers, events]) =>
    bind(
      motionFrom(name, modifiers),
      ["4", "g"].includes(name)
        ? [
            ...events,
            ...reset,
            badge("Codex Vim  ·  NORMAL"),
          ]
        : events,
      modifiers.length ? base : normal,
    ),
  ),
  bind(from("x", ["shift"]), [key("delete_or_backspace")], normal),
  bind(
    from("d", ["shift"]),
    [
      key("right_arrow", ["command", "shift"]),
      key("delete_or_backspace"),
    ],
    normal,
  ),
  bind(
    from("c", ["shift"]),
    [
      key("right_arrow", ["command", "shift"]),
      key("delete_or_backspace"),
      ...enterInsert,
    ],
    normal,
  ),
  bind(from("x"), [key("delete_forward")], normal),
  bind(from("u"), [key("z", ["command"])], normal),
  bind(from("r", ["control"]), [key("z", ["command", "shift"])], normal),
  bind(from("p"), [key("v", ["command"])], normal),
  bind(from("spacebar"), [key("right_arrow")], normal),
  bind(from("return_or_enter"), [key("down_arrow")], normal),

  bind(
    { any: "key_code", modifiers: { optional: ["shift", "caps_lock"] } },
    [...reset, badge("Codex Vim  ·  NORMAL")],
    [...base, { type: "variable_unless", name: O, value: "" }],
  ),
  bind(
    { any: "key_code", modifiers: { optional: ["shift", "caps_lock"] } },
    [set(P, ""), badge("Codex Vim  ·  NORMAL")],
    [...base, is(O, "")],
  ),
];

// Karabiner's generic `shift` matcher is unreliable on some keyboard/input
// source combinations. Compile it to explicit left/right variants instead.
const manipulators = abstractManipulators.flatMap((rule) => {
  const mandatory = rule.from.modifiers?.mandatory;
  if (!mandatory?.includes("shift")) return [rule];
  return ["left_shift", "right_shift"].map((side) => ({
    ...rule,
    from: {
      ...rule.from,
      modifiers: {
        ...rule.from.modifiers,
        mandatory: mandatory.map((modifier) =>
          modifier === "shift" ? side : modifier,
        ),
      },
    },
  }));
});

const config = {
  title: "Codex Vim",
  rules: [
    {
      description: "[aislop] Codex composer Vim mode",
      manipulators,
    },
  ],
};

writeFileSync(
  join(dir, "karabiner-codex-vim.json"),
  `${JSON.stringify(config, null, 2)}\n`,
);
console.log(`generated ${manipulators.length} manipulators`);
