import type { Compilation } from "./model.js";
function escape(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export function tocHtml(c: Compilation) {
  return `<nav class="doc-toc" aria-label="文档目录"><strong>目录</strong><ol>${c.headings.map((h) => `<li style="padding-left:${(h.level - 1) * 14}px"><a href="#${escape(h.id)}">${escape(h.text)}</a></li>`).join("")}</ol></nav>`;
}
