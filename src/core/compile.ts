import MarkdownIt from "markdown-it";
import hljs from "highlight.js/lib/common";
import Token from "markdown-it/lib/token.mjs";
import {
  checkInput,
  type Compilation,
  type Heading,
  type Issue,
} from "./model.js";
export const md: MarkdownIt = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false,
  breaks: false,
  highlight(code, lang): string {
    return lang && hljs.getLanguage(lang)
      ? hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
      : md.utils.escapeHtml(code);
  },
});
md.block.ruler.before("paragraph", "pagebreak", (state, start, end, silent) => {
  const s = state.src
    .slice(state.bMarks[start] + state.tShift[start], state.eMarks[start])
    .trim();
  if (s !== "::: pagebreak") return false;
  if (!silent) {
    const t = state.push("pagebreak", "div", 0);
    t.map = [start, start + 1];
    state.line = start + 1;
  }
  return true;
});
md.renderer.rules.pagebreak = () =>
  '<div class="pagebreak" role="separator"><span>分页</span></div>\n';
export function isLocalImage(src: string) {
  return /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=\r\n]+$/.test(src);
}
md.renderer.rules.image = (tokens, i) => {
  const t = tokens[i],
    src = t.attrGet("src") || "",
    alt = md.utils.escapeHtml(t.content || "图片");
  if (isLocalImage(src))
    return `<img src="${md.utils.escapeHtml(src)}" alt="${alt}" loading="lazy"/>`;
  return `<span class="media-placeholder">▧ ${alt} <small>外部图片未加载 · 请通过「插图」嵌入本地图片</small></span>`;
};
md.renderer.rules.code_inline = (tokens, i) =>
  `<code>${md.utils.escapeHtml(tokens[i].content)}</code>`;
const defaultLink =
  md.renderer.rules.link_open ||
  ((t, i, o, e, self) => self.renderToken(t, i, o));
md.renderer.rules.link_open = (t, i, o, e, self) => {
  t[i].attrSet("rel", "noopener noreferrer");
  if (!t[i].attrGet("href")?.startsWith("#")) t[i].attrSet("target", "_blank");
  return defaultLink(t, i, o, e, self);
};
export function parse(source: string) {
  checkInput(source);
  return md.parse(source, {});
}
export function inlineText(tokens: Token[] | null) {
  return (tokens || [])
    .map((t) =>
      t.type === "image"
        ? t.content
        : t.type === "softbreak" || t.type === "hardbreak"
          ? " "
          : t.nesting === 0
            ? t.content
            : "",
    )
    .join("");
}
md.renderer.rules.task_checkbox = (tokens, i) =>
  `<input class="task-checkbox" type="checkbox" disabled aria-label="${tokens[i].meta.checked ? "已完成任务" : "未完成任务"}"${tokens[i].meta.checked ? " checked" : ""}/>`;
export function prepare(source: string) {
  const tokens = parse(source),
    headings: Heading[] = [],
    issues: Issue[] = [],
    counts = new Map<string, number>(),
    usedIds = new Set<string>();
  for (let i = 0; i < tokens.length; i++) {
    if (
      tokens[i].type !== "list_item_open" ||
      tokens[i + 1]?.type !== "paragraph_open" ||
      tokens[i + 2]?.type !== "inline"
    )
      continue;
    const inline = tokens[i + 2],
      first = inline.children?.[0];
    const marker =
      first?.type === "text" ? /^\[([ xX])\]\s+/.exec(first.content) : null;
    if (!marker || !first) continue;
    const checked = marker[1].toLowerCase() === "x";
    first.content = first.content.slice(marker[0].length);
    inline.meta = { ...inline.meta, taskChecked: checked };
    const box = new Token("task_checkbox", "input", 0);
    box.meta = { checked };
    inline.children!.unshift(box);
    tokens[i].attrJoin("class", "task-item");
    tokens[i + 1].attrJoin("class", "task-paragraph");
  }
  let prev = 0,
    h1 = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i],
      line = (t.map?.[0] || 0) + 1;
    if (t.map && t.nesting !== -1) t.attrSet("data-line", String(line));
    if (t.type === "heading_open") {
      const text = inlineText(tokens[i + 1]?.children || null),
        level = Number(t.tag.slice(1));
      const base =
        text
          .normalize("NFKC")
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\s_-]/gu, "")
          .trim()
          .replace(/\s+/g, "-") || "section";
      let n = counts.get(base) || 0;
      const duplicate = n > 0;
      let id = `section-${base}${n ? `-${n}` : ""}`;
      while (usedIds.has(id)) {
        n++;
        id = `section-${base}-${n}`;
      }
      counts.set(base, n + 1);
      usedIds.add(id);
      t.attrSet("id", id);
      headings.push({ id, text, level, line });
      if (level === 1) h1++;
      if (prev && level > prev + 1)
        issues.push({
          kind: "warning",
          code: "heading-gap",
          line,
          message: `标题从 H${prev} 跳到 H${level}，建议补齐层级`,
        });
      if (duplicate)
        issues.push({
          kind: "info",
          code: "duplicate-heading",
          line,
          message: "同名标题已自动分配不同锚点",
        });
      prev = level;
    }
    if (t.type === "fence") {
      if (["mermaid", "math", "latex"].includes(t.info.trim()))
        issues.push({
          kind: "info",
          code: "literal-block",
          line,
          message: `${t.info.trim()} 首版按代码展示，不执行渲染`,
        });
      if (t.content.split("\n").some((l) => l.length > 110))
        issues.push({
          kind: "info",
          code: "long-code",
          line,
          message: "代码行较长；PDF 会换行，建议校样检查",
        });
    }
    if (t.type === "table_open") {
      const end = tokens.findIndex((v, j) => j > i && v.type === "thead_close");
      const columns = tokens
        .slice(i, end)
        .filter((v) => v.type === "th_open").length;
      if (columns > 5)
        issues.push({
          kind: "warning",
          code: "wide-table",
          line,
          message: `表格有 ${columns} 列，PDF 可能拥挤，建议精简或拆表`,
        });
    }
  }
  const anchorIds = new Set(headings.map((h) => h.id));
  // Accept conventional Markdown anchors too, then rewrite them to collision-safe IDs.
  const conventional = new Map<string, string>();
  for (const h of headings) {
    const raw = h.id.replace(/^section-/, "");
    if (!conventional.has(raw)) conventional.set(raw, h.id);
  }
  for (const t of tokens) {
    if (!t.children) continue;
    for (const child of t.children) {
      const line = (t.map?.[0] || 0) + 1;
      if (child.type === "link_open") {
        const href = child.attrGet("href") || "";
        if (href.startsWith("#")) {
          let key = href.slice(1);
          try {
            key = decodeURIComponent(key);
          } catch {}
          const id = anchorIds.has(key) ? key : conventional.get(key);
          if (id) child.attrSet("href", "#" + id);
          else
            issues.push({
              kind: "warning",
              code: "broken-anchor",
              line,
              message: `找不到文内链接的目标：${href}`,
            });
        }
      }
      if (child.type === "image") {
        if (!child.content.trim())
          issues.push({
            kind: "warning",
            code: "image-alt",
            line,
            message: "图片缺少文字描述，建议补充以便阅读与访问",
          });
        if (!isLocalImage(child.attrGet("src") || ""))
          issues.push({
            kind: "warning",
            code: "external-image",
            line,
            message:
              "外部或相对路径图片不会自动联网加载，请插入本地 PNG / JPEG",
          });
      }
    }
  }
  if (!h1 && source.trim())
    issues.push({
      kind: "info",
      code: "no-title",
      line: 1,
      message: "建议用一个 H1 标题作为文档名称",
    });
  if (h1 > 1)
    issues.push({
      kind: "info",
      code: "many-titles",
      line: headings.find((h) => h.level === 1)?.line || 1,
      message: "文档有多个 H1，建议只保留一个总标题",
    });
  if (issues.length > 200)
    issues.splice(200, Infinity, {
      kind: "info",
      code: "issue-limit",
      line: 1,
      message: "仅展示前 200 条检查结果",
    });
  return { tokens, headings, issues };
}
export function compile(source: string): Compilation {
  const { tokens, headings, issues } = prepare(source);
  const visibleText = tokens
    .map((t) =>
      t.type === "inline"
        ? inlineText(t.children)
        : ["fence", "code_block"].includes(t.type)
          ? t.content
          : "",
    )
    .join("");
  const characters = visibleText.replace(/\s/g, "").length;
  return {
    html: md.renderer.render(tokens, md.options, {}),
    headings,
    issues,
    title: headings.find((h) => h.level === 1)?.text || "未命名文档",
    characters,
    readingMinutes: Math.max(1, Math.ceil(characters / 600)),
  };
}
