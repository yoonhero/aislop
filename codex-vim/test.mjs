import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const [{ manipulators }] = JSON.parse(
  readFileSync(new URL("./karabiner-codex-vim.json", import.meta.url)),
).rules;
const variable = (rule, name) =>
  rule.conditions.find((condition) => condition.name === name)?.value;
const find = (
  key,
  { shift = false, side = "left_shift", operator = "", prefix = "" } = {},
) =>
  manipulators.find(
    (rule) =>
      rule.from.key_code === key &&
      (shift
        ? rule.from.modifiers?.mandatory?.includes(side)
        : !rule.from.modifiers?.mandatory?.some((modifier) =>
            modifier.endsWith("_shift"),
          )) &&
      variable(rule, "aislop_codex_vim_visual") === 0 &&
      variable(rule, "aislop_codex_vim_shift") !== 1 &&
      (variable(rule, "aislop_codex_vim_operator") ?? "") === operator &&
      (variable(rule, "aislop_codex_vim_prefix") ?? "") === prefix,
  );
const emits = (rule, key, modifiers = []) =>
  rule.to.some(
    (event) =>
      event.key_code === key &&
      modifiers.every((modifier) => event.modifiers?.includes(modifier)),
  );
const sets = (rule, name, value) =>
  rule.to.some(
    (event) =>
      event.set_variable?.name === name && event.set_variable.value === value,
  );
const runs = (rule, fragment) =>
  rule.to.some((event) => event.shell_command?.includes(fragment));

assert.ok(manipulators.length > 96);
assert.ok(
  manipulators.every(
    (rule) => !rule.from.modifiers?.mandatory?.includes("shift"),
  ),
);
assert.ok(manipulators.every((rule) => rule.conditions[0].type === "frontmost_application_if"));
assert.ok(
  manipulators.every(
    (rule) => variable(rule, "aislop_codex_vim_textarea") === 1,
  ),
);

const escape = manipulators.find(
  (rule) =>
    rule.from.key_code === "escape" &&
    !rule.from.modifiers?.mandatory?.includes("control"),
);
assert.ok(sets(escape, "aislop_codex_vim_mode", 1));
assert.ok(!emits(escape, "escape"));
assert.ok(runs(escape, "echo normal"));

for (const side of ["left_shift", "right_shift"]) {
  assert.ok(emits(find("i", { shift: true, side }), "left_arrow", ["command"]));
  assert.ok(emits(find("4", { shift: true, side }), "right_arrow", ["command"]));
  assert.ok(emits(find("g", { shift: true, side }), "down_arrow", ["command"]));
}

const shiftLayer = manipulators.find(
  (rule) =>
    rule.from.key_code === "left_shift" &&
    sets(rule, "aislop_codex_vim_shift", 1),
);
assert.ok(shiftLayer);
assert.ok(
  shiftLayer.to_after_key_up.some(
    (event) =>
      event.set_variable?.name === "aislop_codex_vim_shift" &&
      event.set_variable.value === 0,
  ),
);
for (const [source, output] of [
  ["i", "left_arrow"],
  ["4", "right_arrow"],
  ["g", "down_arrow"],
]) {
  const rule = manipulators.find(
    (candidate) =>
      candidate.from.key_code === source &&
      variable(candidate, "aislop_codex_vim_shift") === 1,
  );
  assert.ok(rule);
  assert.ok(emits(rule, output, ["command"]));
}
assert.ok(sets(find("d"), "aislop_codex_vim_operator", "d"));
assert.ok(emits(find("d", { operator: "d" }), "delete_or_backspace"));
assert.ok(emits(find("w", { operator: "d" }), "right_arrow", ["option", "shift"]));
assert.ok(emits(find("b", { operator: "d" }), "left_arrow", ["option", "shift"]));

assert.ok(sets(find("i", { operator: "c" }), "aislop_codex_vim_prefix", "i"));
const ciw = find("w", { operator: "c", prefix: "i" });
assert.ok(emits(ciw, "left_arrow", ["option"]));
assert.ok(emits(ciw, "right_arrow", ["option", "shift"]));
assert.ok(sets(ciw, "aislop_codex_vim_mode", 0));

assert.ok(sets(find("g"), "aislop_codex_vim_prefix", "g"));
assert.ok(emits(find("g", { prefix: "g" }), "up_arrow", ["command"]));
assert.ok(emits(find("g", { operator: "d", prefix: "g" }), "up_arrow", ["command", "shift"]));
assert.ok(runs(find("i"), "echo insert"));
assert.ok(
  runs(
    manipulators.find(
      (rule) =>
        rule.from.key_code === "v" &&
        variable(rule, "aislop_codex_vim_visual") === 0,
    ),
    "echo visual",
  ),
);

const append = manipulators.filter(
  (rule) =>
    rule.from.key_code === "a" &&
    !rule.from.modifiers?.mandatory?.some((modifier) =>
      modifier.endsWith("_shift"),
    ) &&
    variable(rule, "aislop_codex_vim_operator") === "" &&
    variable(rule, "aislop_codex_vim_prefix") === "",
);
assert.equal(append.length, 2);
assert.ok(
  emits(
    append.find(
      (rule) => variable(rule, "aislop_codex_vim_right_in_line") === 1,
    ),
    "right_arrow",
  ),
);
assert.ok(
  !emits(
    append.find(
      (rule) => variable(rule, "aislop_codex_vim_right_in_line") === 0,
    ),
    "right_arrow",
  ),
);

console.log("Codex Vim composition: ok");
