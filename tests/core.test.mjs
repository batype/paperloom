import test from "node:test";
import assert from "node:assert/strict";
import { compile, prepare } from "../lib/compile.js";
import { exportHtml } from "../lib/html.js";
import { buildPdf } from "../lib/pdf.js";
import {
  DEFAULT_OPTIONS,
  checkInput,
  filename,
  validateOptions,
} from "../lib/model.js";
import { templates } from "../lib/templates.js";
test("safe Markdown preserves Chinese, code, tables and inline formats", () => {
  const r = compile(
    '# 中文文档\n\n**重点** 与 ~~删除~~\n\n```js\nconst x = "<b>";\n```\n\n| A | B |\n| --- | --- |\n| 001 | 9007199254740993 |',
  );
  assert.match(r.html, /<strong>重点<\/strong>/);
  assert.match(r.html, /<s>删除<\/s>/);
  assert.match(r.html, /<table/);
  assert.match(r.html, /9007199254740993/);
  assert.match(r.html, /hljs/);
});
test("HTML scripts, handlers and unsafe links cannot execute", () => {
  const r = compile(
    "# X\n\n<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[x](javascript:alert(1))",
  );
  assert.doesNotMatch(r.html, /<script|<img|href="javascript:/);
  assert.match(r.html, /&lt;script&gt;/);
});
test("external images are never loaded; PNGs and JPEGs can be embedded", () => {
  const a = compile("![logo](https://example.test/a.png)");
  assert.doesNotMatch(a.html, /<img/);
  assert.equal(a.issues[0].code, "external-image");
  const b = compile("![x](data:image/png;base64,aA==)");
  assert.match(b.html, /<img src="data:image\/png/);
  const svg = compile("![x](data:image/svg+xml;base64,aA==)");
  assert.doesNotMatch(svg.html, /<img/);
});
test("duplicate headings have unique ids and links resolve consistently", () => {
  const r = compile("# 文档\n\n## 介绍\n\n## 介绍\n\n[目标](#介绍)");
  assert.equal(new Set(r.headings.map((h) => h.id)).size, 3);
  assert.match(r.html, /href="#section-介绍"/);
  assert(r.issues.some((i) => i.code === "duplicate-heading"));
  assert(!r.issues.some((i) => i.code === "broken-anchor"));
});
test("invalid anchor and skipped heading levels carry source line numbers", () => {
  const r = compile("# 标题\n\n### 跳级\n\n[失效](#missing)");
  assert.deepEqual(
    r.issues.filter((i) => i.kind === "warning").map((i) => [i.code, i.line]),
    [
      ["heading-gap", 3],
      ["broken-anchor", 5],
    ],
  );
});
test("pagination marker only has effect outside fenced code", () => {
  const a = prepare(
    "# 标题\n\n::: pagebreak\n\n## 第二页\n\n```\n::: pagebreak\n```",
  );
  assert.equal(a.tokens.filter((t) => t.type === "pagebreak").length, 1);
  assert.match(compile("```\n::: pagebreak\n```").html, /::: pagebreak/);
});
test("standalone HTML contains selected theme, TOC, CSP and original text", () => {
  const html = exportHtml("# 文档\n\n## 章节", {
    ...DEFAULT_OPTIONS,
    theme: "editorial",
    toc: true,
  });
  assert.match(html, /<!doctype html>/);
  assert.match(html, /data-layout="editorial"/);
  assert.match(html, /nav class="doc-toc"/);
  assert.match(html, /default-src 'none'/);
  assert.doesNotMatch(html, /<script|https:\/\/fonts/);
  assert.match(html, /章节/);
});
test("PDF preserves semantic headings, selectable text, lists and table cells", () => {
  const d = buildPdf(
    "# 测试\n\n**重点**\n\n- 一\n- 二\n\n| A | B |\n| --- | --- |\n| 001 | 中文 |\n\n::: pagebreak\n\n下一页",
    { ...DEFAULT_OPTIONS, toc: true },
  );
  assert.equal(d.defaultStyle.font, "NotoSC");
  assert.match(JSON.stringify(d.content), /"id":"section-测试"/);
  assert(d.content.some((n) => n.ul));
  assert(d.content.some((n) => n.table?.headerRows === 1));
  assert(d.content.some((n) => n.pageBreak === "before"));
  assert.match(JSON.stringify(d.content), /重点/);
});
test("nested lists, quotes, empty documents and ordered start remain valid", () => {
  for (const input of ["", "> 引用\n>\n> - 嵌套\n>   - 子项", "3. 三\n4. 四"]) {
    const d = buildPdf(input, DEFAULT_OPTIONS);
    assert(d.content.length > 0);
  }
  assert.equal(buildPdf("3. 三\n4. 四", DEFAULT_OPTIONS).content[0].start, 3);
});
test("all templates pass document checks and render every theme", () => {
  for (const t of templates) {
    assert.equal(
      compile(t.source).issues.filter((i) => i.kind === "warning").length,
      0,
    );
    for (const theme of ["manual", "editorial", "report"])
      assert(exportHtml(t.source, { ...DEFAULT_OPTIONS, theme }).length > 1000);
  }
});
test("bounds and invalid config are explicit; filenames are safe", () => {
  assert.throws(() => checkInput("a".repeat(4 * 1024 * 1024 + 1)), /4 MiB/);
  assert.throws(() => checkInput("\n".repeat(12000)), /12,000/);
  assert.throws(() =>
    validateOptions({ ...DEFAULT_OPTIONS, theme: "<script>" }),
  );
  assert.throws(() => validateOptions({ ...DEFAULT_OPTIONS, fontSize: 100 }));
  assert.equal(filename("../a/b:*?"), "ab");
  assert.equal(filename(".."), "untitled");
});
test("wide tables and unsupported diagram rendering are reported", () => {
  const s =
    "|a|b|c|d|e|f|\n|---|---|---|---|---|---|\n|1|2|3|4|5|6|\n\n```mermaid\ngraph TD; A-->B;\n```";
  const r = compile(s);
  assert(r.issues.some((i) => i.code === "wide-table"));
  assert(r.issues.some((i) => i.code === "literal-block"));
});

test("heading suffixes never collide with original heading text", () => {
  const r = compile("# Foo\n\n## Foo\n\n## Foo-1\n\n## Foo");
  assert.equal(new Set(r.headings.map((h) => h.id)).size, 4);
});

test("reading statistics exclude embedded image data and Markdown syntax", () => {
  const r = compile(
    "# 标题\n\n**正文**\n\n![图](data:image/png;base64," +
      "a".repeat(3000) +
      "==)",
  );
  assert.equal(r.characters, 5);
  assert.equal(r.readingMinutes, 1);
});
