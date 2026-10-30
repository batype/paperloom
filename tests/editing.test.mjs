import test from "node:test";
import assert from "node:assert/strict";
import { markdownEdit, safeLink } from "../lib/editing.js";
import { compile } from "../lib/compile.js";
import { buildPdf } from "../lib/pdf.js";
import { DEFAULT_OPTIONS } from "../lib/model.js";
function apply(doc, from, to, action) {
  const e = markdownEdit(doc, from, to, action);
  const text = doc.slice(0, e.from) + e.insert + doc.slice(e.to);
  assert(e.anchor >= 0 && e.head <= text.length);
  return { ...e, text, selection: text.slice(e.anchor, e.head) };
}
test("format selection, toggle it off and keep unrelated content intact", () => {
  for (const type of ["bold", "italic", "strike", "inline-code"]) {
    const r = apply("前 中文 后", 2, 4, { type });
    assert.equal(r.selection, "中文");
    const undo = apply(r.text, r.anchor, r.head, { type });
    assert.equal(undo.text, "前 中文 后");
  }
});
test("empty formatting creates an editable placeholder; whole marked text can be unwrapped", () => {
  assert.equal(apply("", 0, 0, { type: "bold" }).selection, "粗体文字");
  assert.equal(apply("**重点**", 0, 6, { type: "bold" }).text, "重点");
  assert.equal(apply("x *强调* y", 2, 6, { type: "italic" }).text, "x 强调 y");
});
test("heading changes apply to current line and replace rather than stack headings", () => {
  assert.equal(
    apply("甲\n正文\n乙", 3, 3, { type: "heading", level: 2 }).text,
    "甲\n## 正文\n乙",
  );
  assert.equal(
    apply("## 标题", 3, 5, { type: "heading", level: 3 }).text,
    "### 标题",
  );
  assert.equal(
    apply("## 标题", 3, 5, { type: "heading", level: 2 }).text,
    "标题",
  );
  assert.equal(
    apply("# 标题", 2, 4, { type: "heading", level: 0 }).text,
    "标题",
  );
});
test("selected line boundaries do not format the next unselected line", () => {
  const r = apply("甲\n乙\n丙", 0, 4, { type: "bullet" });
  assert.equal(r.text, "- 甲\n- 乙\n丙");
  assert.equal(
    apply(r.text, r.anchor, r.head, { type: "bullet" }).text,
    "甲\n乙\n丙",
  );
});
test("convert and toggle bullet, numbered and task lists without losing text or indentation", () => {
  const r = apply("- 甲\n- 乙", 0, 7, { type: "ordered" });
  assert.equal(r.text, "1. 甲\n2. 乙");
  const task = apply("1. 甲\n2. 乙", 0, 9, { type: "task" });
  assert.equal(task.text, "- [ ] 甲\n- [ ] 乙");
  assert.equal(
    apply(task.text, task.anchor, task.head, { type: "task" }).text,
    "甲\n乙",
  );
  assert.equal(
    apply("  - 甲\n\n  - 乙", 0, 12, { type: "task" }).text,
    "  - [ ] 甲\n\n  - [ ] 乙",
  );
});
test("quotes and indentation are reversible and preserve blank lines", () => {
  const r = apply("甲\n\n乙", 0, 4, { type: "quote" });
  assert.equal(r.text, "> 甲\n\n> 乙");
  assert.equal(
    apply(r.text, r.anchor, r.head, { type: "quote" }).text,
    "甲\n\n乙",
  );
  const ind = apply("甲\n乙", 0, 3, { type: "indent" });
  assert.equal(
    apply(ind.text, ind.anchor, ind.head, { type: "outdent" }).text,
    "甲\n乙",
  );
});
test("links put selected words into the label and preserve complex destinations", () => {
  const r = apply("查看文档", 2, 4, {
    type: "link",
    label: "文档",
    url: "https://example.com/a(b)?x=1",
  });
  assert.match(
    compile(r.text).html,
    /href="https:\/\/example.com\/a\(b\)\?x=1"/,
  );
  assert.match(compile(r.text).html, />文档<\/a>/);
  assert.equal(safeLink("javascript:alert(1)"), false);
  assert.equal(safeLink("https://"), false);
  assert.throws(() =>
    markdownEdit("", 0, 0, {
      type: "link",
      label: "x",
      url: "data:text/html,x",
    }),
  );
});
test("code fences adapt to selected backticks and standalone blocks do not swallow neighbours", () => {
  const r = apply("前正文后", 1, 3, {
    type: "codeblock",
    language: "markdown",
  });
  assert.equal(r.selection, "正文");
  assert.match(r.text, /前\n\n```markdown\n正文\n```\n\n后/);
  const s = "```js\nx\n```";
  const nested = apply(s, 0, s.length, {
    type: "codeblock",
    language: "markdown",
  });
  assert.equal(nested.text, "x");
  const body = "a\n```\nb";
  const wrapped = apply(body, 0, body.length, {
    type: "codeblock",
    language: "markdown",
  });
  assert.match(wrapped.text, /^````markdown/);
  assert.match(compile(wrapped.text).html, /```/);
});
test("inline code can contain literal backticks", () => {
  const r = apply("a`b", 0, 3, { type: "inline-code" });
  assert.match(r.text, /^``/);
  assert.match(compile(r.text).html, /<code>a`b<\/code>/);
});
test("tables and divider/page markers retain selected text", () => {
  const t = apply("保留", 0, 2, { type: "table", columns: 3, rows: 2 });
  assert.equal((compile(t.text).html.match(/<th/g) || []).length, 4);
  assert.match(t.text, /保留/);
  assert.match(apply("保留", 0, 2, { type: "rule" }).text, /---\n\n保留/);
  assert.match(
    apply("保留", 0, 2, { type: "pagebreak" }).text,
    /::: pagebreak\n\n保留/,
  );
  assert.throws(() =>
    markdownEdit("", 0, 0, { type: "table", rows: 100, columns: 20 }),
  );
});
test("GFM tasks render in HTML and PDF while ordinary lists/code keep old behaviour", () => {
  const s =
    "- [ ] 待办\n- [x] **完成**\n  - 子项\n- 普通\n\n```\n- [x] 代码\n```";
  const r = compile(s);
  assert.equal((r.html.match(/class="task-checkbox"/g) || []).length, 2);
  assert.match(r.html, /aria-label="已完成任务" checked/);
  assert.match(r.html, /<strong>完成<\/strong>/);
  assert.match(r.html, /- \[x\] 代码/);
  const d = buildPdf(s, DEFAULT_OPTIONS);
  assert.match(JSON.stringify(d), /"listType":"none"/);
  assert.match(JSON.stringify(d), /"type":"rect"/);
  assert.doesNotMatch(JSON.stringify(d.content), /\[x\].*完成/);
});

test("italic stacks on selected bold text and padded inline code toggles cleanly", () => {
  assert.equal(apply("**重点**", 0, 6, { type: "italic" }).text, "***重点***");
  const r = apply("`literal` inside", 0, 16, { type: "inline-code" });
  assert.match(compile(r.text).html, /<code>`literal` inside<\/code>/);
  assert.equal(
    apply(r.text, r.anchor, r.head, { type: "inline-code" }).text,
    "`literal` inside",
  );
});

test("italic can be added inside bold and removed from combined formatting", () => {
  const r = apply("**重点**", 2, 4, { type: "italic" });
  assert.equal(r.text, "***重点***");
  assert.equal(
    apply(r.text, r.anchor, r.head, { type: "italic" }).text,
    "**重点**",
  );
  assert.equal(apply("***重点***", 0, 8, { type: "italic" }).text, "**重点**");
});
