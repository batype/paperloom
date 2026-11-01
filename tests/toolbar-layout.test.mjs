import test from "node:test";
import assert from "node:assert/strict";
import { visibleToolbarCount } from "../lib/toolbar-layout.js";
test("no More button is reserved when every tool fits, including exact boundaries", () => {
  assert.equal(visibleToolbarCount(106, [25, 25, 50], 50, 3), 3);
  assert.equal(visibleToolbarCount(200, [25, 25, 50], 50, 3), 3);
});
test("More reserves its own width and gaps only after tools overflow", () => {
  assert.equal(visibleToolbarCount(105, [25, 25, 50], 50, 3), 1);
  assert.equal(visibleToolbarCount(109, [25, 25, 50, 25], 50, 3), 2);
  assert.equal(visibleToolbarCount(108, [25, 25, 50, 25], 50, 3), 2);
  assert.equal(visibleToolbarCount(105.9, [25, 25, 50, 25], 50, 3), 1);
});
test("resizing back to a wide layout restores all tools without a leftover More button", () => {
  const widths = Array(20).fill(25);
  assert.equal(visibleToolbarCount(350, widths, 53, 3), 10);
  assert.equal(visibleToolbarCount(600, widths, 53, 3), 20);
  assert.equal(visibleToolbarCount(250, widths, 53, 3), 7);
  assert.equal(visibleToolbarCount(600, widths, 53, 3), 20);
});
test("very narrow and empty layouts retain all actions in overflow safely", () => {
  assert.equal(visibleToolbarCount(40, [25, 53], 50, 3), 0);
  assert.equal(visibleToolbarCount(0, [], 50, 3), 0);
});
