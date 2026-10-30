import type Token from "markdown-it/lib/token.mjs";
import type { TDocumentDefinitions, Content } from "pdfmake/interfaces";
import { prepare, isLocalImage } from "./compile.js";
import { palettes } from "./styles.js";
import { validateOptions, type Options } from "./model.js";
type Node = Record<string, any>;
function inline(tokens: Token[] | null, accent: string): Node[] {
  const out: Node[] = [],
    styles: Node[] = [{}];
  for (const t of tokens || []) {
    const s = styles[styles.length - 1];
    if (t.nesting === 1) {
      styles.push({
        ...s,
        ...(t.type === "strong_open" ? { bold: true } : {}),
        ...(t.type === "em_open" ? { italics: true } : {}),
        ...(t.type === "s_open" ? { decoration: "lineThrough" } : {}),
        ...(t.type === "link_open"
          ? {
              link: t.attrGet("href")?.startsWith("#")
                ? undefined
                : t.attrGet("href"),
              linkToDestination: t.attrGet("href")?.startsWith("#")
                ? t.attrGet("href")?.slice(1)
                : undefined,
              color: accent,
              decoration: "underline",
            }
          : {}),
      });
    } else if (t.nesting === -1) {
      if (styles.length > 1) styles.pop();
    } else if (t.type === "image")
      out.push({
        ...s,
        text: `[图片：${t.content || "未命名"}]`,
        color: "#69748a",
      });
    else if (t.type === "softbreak" || t.type === "hardbreak")
      out.push({ ...s, text: "\n" });
    else if (t.type === "code_inline")
      out.push({ ...s, text: t.content, color: accent });
    else out.push({ ...s, text: t.content });
  }
  return out.length ? out : [{ text: "" }];
}
export function buildPdf(source: string, value: Options): TDocumentDefinitions {
  const o = validateOptions(value),
    p = palettes[o.theme],
    { tokens, headings } = prepare(source);
  let pos = 0;
  function sequence(close?: string): Node[] {
    const out: Node[] = [];
    while (pos < tokens.length) {
      const t = tokens[pos++];
      if (t.type === close) break;
      if (t.type === "heading_open") {
        const it = tokens[pos++];
        pos++;
        const level = Number(t.tag.slice(1));
        out.push({
          text: inline(it.children, p.accent),
          fontSize:
            level === 1
              ? o.theme === "editorial"
                ? 30
                : o.theme === "report"
                  ? 25
                  : 27
              : level === 2
                ? 18
                : level === 3
                  ? 13
                  : 11,
          bold: true,
          color: level >= 3 || o.theme === "report" ? p.accent : p.ink,
          alignment: o.theme === "editorial" && level === 1 ? "center" : "left",
          margin: [
            0,
            level === 1 ? 0 : 16,
            0,
            o.theme === "editorial" ? 16 : 10,
          ],
          id: t.attrGet("id"),
          tocItem: o.toc,
          tocStyle: { fontSize: 10 },
          tocMargin: [(level - 1) * 12, 3, 0, 3],
          headlineLevel: level,
        });
      } else if (t.type === "paragraph_open") {
        const it = tokens[pos++];
        pos++;
        // Full-paragraph embedded images are semantic PDF image nodes, inline images remain labelled text.
        const children = it.children || [],
          images = children.filter((v) => v.type === "image");
        if (
          images.length &&
          children.every(
            (v) =>
              v.type === "image" ||
              v.type === "softbreak" ||
              (v.type === "text" && !v.content.trim()),
          )
        ) {
          for (const im of images) {
            const src = im.attrGet("src") || "";
            if (isLocalImage(src))
              out.push({
                image: src,
                fit: [o.pageSize === "A4" ? 475 : 490, 600],
                margin: [0, 8, 0, 12],
              });
            else
              out.push({
                text: `[图片：${im.content || "未命名"} · 外部图片未嵌入]`,
                color: p.muted,
                margin: [0, 8, 0, 12],
              });
          }
        } else
          out.push({
            text: inline(children, p.accent),
            margin: [0, 0, 0, 10],
            ...(typeof it.meta?.taskChecked === "boolean"
              ? { taskChecked: it.meta.taskChecked }
              : {}),
          });
      } else if (
        t.type === "bullet_list_open" ||
        t.type === "ordered_list_open"
      ) {
        const list: Node[] = [];
        const end =
          t.type === "bullet_list_open"
            ? "bullet_list_close"
            : "ordered_list_close";
        while (pos < tokens.length && tokens[pos].type !== end) {
          if (tokens[pos++].type === "list_item_open") {
            const stack = sequence("list_item_close"),
              first = stack[0];
            if (typeof first?.taskChecked === "boolean") {
              const checked = first.taskChecked;
              delete first.taskChecked;
              const canvas: Node[] = [
                {
                  type: "rect",
                  x: 0,
                  y: 4,
                  w: 8,
                  h: 8,
                  lineWidth: 0.7,
                  lineColor: p.muted,
                },
              ];
              if (checked)
                canvas.push(
                  {
                    type: "line",
                    x1: 1.5,
                    y1: 8,
                    x2: 3.5,
                    y2: 10,
                    lineWidth: 1,
                    lineColor: p.accent,
                  },
                  {
                    type: "line",
                    x1: 3.5,
                    y1: 10,
                    x2: 7,
                    y2: 5.5,
                    lineWidth: 1,
                    lineColor: p.accent,
                  },
                );
              list.push({
                listType: "none",
                columns: [
                  { width: 12, canvas },
                  { width: "*", stack },
                ],
                columnGap: 3,
              });
            } else list.push({ stack });
          }
        }
        pos++;
        out.push({
          [t.type === "bullet_list_open" ? "ul" : "ol"]: list,
          ...(t.type === "ordered_list_open"
            ? { start: Number(t.attrGet("start") || 1) }
            : {}),
          margin: [0, 0, 0, 8],
        });
      } else if (t.type === "blockquote_open") {
        out.push({
          table: {
            widths: [3, "*"],
            body: [
              [
                { text: "", fillColor: p.accent },
                {
                  stack: sequence("blockquote_close"),
                  fillColor: p.soft,
                  margin: [10, 8, 8, 0],
                },
              ],
            ],
          },
          layout: "noBorders",
          margin: [0, 8, 0, 14],
        });
      } else if (t.type === "fence" || t.type === "code_block") {
        const code = t.content.replace(/\n$/, "").replace(/\t/g, "  ");
        out.push({
          table: {
            widths: ["*"],
            body: [
              [
                {
                  text: code || " ",
                  fontSize: o.fontSize - 1,
                  color: "#33415c",
                  fillColor: "#f3f5f9",
                  margin: [10, 8, 10, 8],
                  preserveLeadingSpaces: true,
                },
              ],
            ],
          },
          layout: "noBorders",
          margin: [0, 5, 0, 13],
        });
      } else if (t.type === "table_open") {
        const rows: Node[][] = [];
        let row: Node[] = [];
        let header = true,
          headers = 0;
        while (pos < tokens.length) {
          const c = tokens[pos++];
          if (c.type === "table_close") break;
          if (c.type === "tr_open") row = [];
          if (c.type === "th_open" || c.type === "td_open") {
            const it = tokens[pos++];
            pos++;
            const align = /text-align:(left|center|right)/.exec(
              c.attrGet("style") || "",
            )?.[1];
            row.push({
              text: inline(it.children, p.accent),
              bold: header,
              fillColor: header ? p.soft : undefined,
              color: header ? p.accent : p.ink,
              alignment: align || "left",
              margin: [5, 5, 5, 5],
            });
          }
          if (c.type === "tr_close") {
            rows.push(row);
            if (header) headers++;
          }
          if (c.type === "thead_close") header = false;
        }
        if (rows.length)
          out.push({
            table: {
              headerRows: headers,
              keepWithHeaderRows: 1,
              widths: rows[0].map(() => "*"),
              body: rows,
            },
            layout: {
              hLineColor: p.line,
              vLineColor: p.line,
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
            },
            fontSize: Math.max(8, o.fontSize - 1),
            margin: [0, 7, 0, 14],
          });
      } else if (t.type === "hr")
        out.push({
          canvas: [
            {
              type: "line",
              x1: 0,
              x2: 160,
              y1: 0,
              y2: 0,
              lineWidth: 1,
              lineColor: p.line,
            },
          ],
          margin: [0, 12, 0, 18],
        });
      else if (t.type === "pagebreak")
        out.push({ text: "", pageBreak: "before" });
    }
    return out;
  }
  const raw: Node[] = sequence(),
    content: Node[] = [];
  // Keep a heading with its first short paragraph. Long paragraphs remain splittable.
  for (let i = 0; i < raw.length; i++) {
    const current = raw[i],
      next = raw[i + 1];
    const textLength = next?.text ? JSON.stringify(next.text).length : Infinity;
    if (
      current.headlineLevel &&
      next?.text &&
      !next.headlineLevel &&
      textLength < 1200
    ) {
      content.push({ stack: [current, next], unbreakable: true });
      i++;
    } else content.push(current);
  }
  if (o.toc && headings.length)
    content.unshift({
      toc: {
        title: {
          text: "目录",
          fontSize: 24,
          bold: true,
          margin: [0, 0, 0, 18],
        },
      },
      pageBreak: "after",
    });
  if (!content.length) content.push({ text: " " });
  const title = headings.find((h) => h.level === 1)?.text || "未命名文档";
  return {
    info: { title, creator: "Paperloom", producer: "Paperloom / pdfmake" },
    pageSize: o.pageSize,
    pageMargins: [52, 48, 52, o.footer ? 52 : 48],
    defaultStyle: {
      font: "NotoSC",
      fontSize: o.fontSize,
      lineHeight: o.theme === "editorial" ? 1.65 : 1.5,
      color: p.ink,
    },
    content: content as Content[],
    footer: o.footer
      ? (current, total) => ({
          columns: [
            { text: title.slice(0, 36), color: p.muted },
            {
              text: `${current} / ${total}`,
              alignment: "right",
              color: p.muted,
            },
          ],
          fontSize: 8,
          margin: [52, 17, 52, 0],
        })
      : undefined,
    pageBreakBefore: (node, following) =>
      Boolean(node.headlineLevel && following.length === 0),
  };
}
