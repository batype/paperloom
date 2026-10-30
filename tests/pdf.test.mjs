import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { buildPdf } from "../lib/pdf.js";
import { templates } from "../lib/templates.js";
import { DEFAULT_OPTIONS } from "../lib/model.js";
const require = createRequire(import.meta.url),
  pdf = require("pdfmake/build/pdfmake.js");
const fonts = {
  NotoSC: {
    normal: "regular.ttf",
    bold: "bold.ttf",
    italics: "regular.ttf",
    bolditalics: "bold.ttf",
  },
};
const vfs = {
  "regular.ttf": readFileSync(
    new URL("../public/fonts/NotoSansSC-Regular.ttf", import.meta.url),
  ).toString("base64"),
  "bold.ttf": readFileSync(
    new URL("../public/fonts/NotoSansSC-Bold.ttf", import.meta.url),
  ).toString("base64"),
};
test("the actual PDF engine emits all three themes, TOC and embedded Chinese fonts", async () => {
  for (const t of templates) {
    const d = buildPdf(t.source, {
      ...DEFAULT_OPTIONS,
      theme: t.theme,
      toc: t.theme === "report",
    });
    const buffer = await new Promise((resolve) =>
      pdf.createPdf(d, undefined, fonts, vfs).getBuffer(resolve),
    );
    assert.equal(buffer.subarray(0, 5).toString(), "%PDF-");
    assert(buffer.length > 10000);
    assert.match(buffer.toString("latin1"), /\/ToUnicode/);
    assert.match(buffer.toString("latin1"), /\/FontFile2/);
  }
});
test("real PDF creation supports PNG images, nested lists and long code", async () => {
  const png =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jT1sAAAAASUVORK5CYII=";
  const s =
    "# 图片和列表\n\n![图片](" +
    png +
    ")\n\n- 一\n  - 子项\n\n```\n" +
    ("long_token_".repeat(35) + "\n").repeat(40) +
    "```";
  const buffer = await new Promise((resolve) =>
    pdf
      .createPdf(buildPdf(s, DEFAULT_OPTIONS), undefined, fonts, vfs)
      .getBuffer(resolve),
  );
  assert(buffer.length > 5000);
  assert.match(buffer.toString("latin1"), /\/Subtype \/Image/);
});
