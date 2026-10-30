/** Pure Markdown edits. All offsets use CodeMirror/JavaScript UTF-16 positions. */
export type MarkdownAction =
  | {
      type:
        | "bold"
        | "italic"
        | "strike"
        | "inline-code"
        | "bullet"
        | "ordered"
        | "task"
        | "quote"
        | "rule"
        | "pagebreak"
        | "indent"
        | "outdent";
    }
  | { type: "heading"; level: number }
  | { type: "link"; label: string; url: string }
  | { type: "codeblock"; language?: string }
  | { type: "table"; rows: number; columns: number };
export interface MarkdownEdit {
  from: number;
  to: number;
  insert: string;
  anchor: number;
  head: number;
}
export function safeLink(url: string): boolean {
  if (!url.trim() || /[\u0000-\u001f\u007f]/.test(url)) return false;
  if (/^https?:\/\//i.test(url)) {
    try {
      const u = new URL(url);
      return !!u.hostname;
    } catch {
      return false;
    }
  }
  return /^(mailto:|tel:|#|\.{0,2}\/)/i.test(url);
}
export function markdownEdit(
  doc: string,
  from: number,
  to: number,
  a: MarkdownAction,
): MarkdownEdit {
  from = Math.max(0, Math.min(from, doc.length));
  to = Math.max(from, Math.min(to, doc.length));
  const selected = doc.slice(from, to);
  const edit = (
    start: number,
    end: number,
    text: string,
    anchor = start,
    head = anchor,
  ): MarkdownEdit => ({ from: start, to: end, insert: text, anchor, head });
  const wrap = (mark: string, placeholder: string) => {
    if (
      selected.startsWith(mark) &&
      selected.endsWith(mark) &&
      selected.length > mark.length * 2 &&
      !(
        mark === "*" &&
        ((/^\*+/.exec(selected)?.[0].length || 0) % 2 === 0 ||
          (/\*+$/.exec(selected)?.[0].length || 0) % 2 === 0)
      )
    ) {
      const s = selected.slice(mark.length, -mark.length);
      return edit(from, to, s, from, from + s.length);
    }
    if (
      from >= mark.length &&
      doc.slice(from - mark.length, from) === mark &&
      doc.slice(to, to + mark.length) === mark &&
      !(
        mark === "*" &&
        ((/\*+$/.exec(doc.slice(0, from))?.[0].length || 0) % 2 === 0 ||
          (/^\*+/.exec(doc.slice(to))?.[0].length || 0) % 2 === 0)
      )
    )
      return edit(
        from - mark.length,
        to + mark.length,
        selected,
        from - mark.length,
        to - mark.length,
      );
    const s = selected || placeholder;
    return edit(
      from,
      to,
      mark + s + mark,
      from + mark.length,
      from + mark.length + s.length,
    );
  };
  if (a.type === "bold") return wrap("**", "粗体文字");
  if (a.type === "italic") return wrap("*", "斜体文字");
  if (a.type === "strike") return wrap("~~", "删除文字");
  if (a.type === "inline-code") {
    const wrapped = /^(`+)([\s\S]*?)\1$/.exec(selected);
    if (
      wrapped &&
      wrapped[2] &&
      !wrapped[2].startsWith("`") &&
      !wrapped[2].endsWith("`")
    ) {
      const s = wrapped[2].replace(/^ (.*) $/s, "$1");
      return edit(from, to, s, from, from + s.length);
    }
    const before = /(`+)( ?)$/.exec(doc.slice(0, from)),
      after = /^( ?)(`+)/.exec(doc.slice(to));
    if (before && after && before[1] === after[2] && before[2] === after[1])
      return edit(
        from - before[0].length,
        to + after[0].length,
        selected,
        from - before[0].length,
        to - before[0].length,
      );
    const body = selected || "代码";
    let longest = 0;
    for (const m of body.matchAll(/`+/g))
      longest = Math.max(longest, m[0].length);
    const mark = "`".repeat(longest + 1),
      pad = /^`|`$/.test(body) ? " " : "";
    return edit(
      from,
      to,
      mark + pad + body + pad + mark,
      from + mark.length + pad.length,
      from + mark.length + pad.length + body.length,
    );
  }
  if (a.type === "link") {
    const url = a.url.trim();
    if (!safeLink(url))
      throw new Error(
        "请输入完整的 http(s) 链接、mailto、tel、文内 #锚点或相对路径",
      );
    const label = (a.label || selected || "链接文字")
      .replace(/\n/g, " ")
      .replace(/[\\\[\]]/g, "\\$&");
    const destination = /[\s()<>\\]/.test(url)
      ? "<" + url.replace(/[<>\\\s]/g, (c) => encodeURIComponent(c)) + ">"
      : url;
    const s = `[${label}](${destination})`;
    return edit(from, to, s, from + 1, from + 1 + label.length);
  }
  function block(body: string, selectFrom = 0, selectLength = 0) {
    const before = doc.slice(0, from),
      after = doc.slice(to);
    const prefix =
      !before || before.endsWith("\n\n")
        ? ""
        : before.endsWith("\n")
          ? "\n"
          : "\n\n";
    const suffix = !after
      ? "\n"
      : after.startsWith("\n\n")
        ? ""
        : after.startsWith("\n")
          ? "\n"
          : "\n\n";
    const start = from + prefix.length + selectFrom;
    return edit(from, to, prefix + body + suffix, start, start + selectLength);
  }
  if (a.type === "codeblock") {
    const existing = /^(`{3,}|~{3,})[^\n]*\n([\s\S]*?)\n\1\n?$/.exec(selected);
    if (existing)
      return edit(from, to, existing[2], from, from + existing[2].length);
    const language = a.language || "";
    if (!/^[\w+.#-]{0,30}$/.test(language))
      throw new Error("代码语言标记不正确");
    const body = selected || "在这里输入代码";
    let longest = 2;
    for (const m of body.matchAll(/`+/g))
      longest = Math.max(longest, m[0].length);
    const fence = "`".repeat(longest + 1);
    return block(
      fence + language + "\n" + body + "\n" + fence,
      fence.length + language.length + 1,
      body.length,
    );
  }
  if (a.type === "table") {
    if (
      !Number.isInteger(a.rows) ||
      !Number.isInteger(a.columns) ||
      a.rows < 1 ||
      a.rows > 20 ||
      a.columns < 1 ||
      a.columns > 6
    )
      throw new Error("表格支持 1–6 列、1–20 行数据");
    const row = (cells: string[]) => "| " + cells.join(" | ") + " |";
    const header = row(
      Array.from({ length: a.columns }, (_, i) => `列 ${i + 1}`),
    );
    const body = [
      header,
      row(Array(a.columns).fill("---")),
      ...Array.from({ length: a.rows }, () =>
        row(Array(a.columns).fill("内容")),
      ),
    ];
    const table = body.join("\n");
    return block(table + (selected ? "\n\n" + selected : ""), 2, 3);
  }
  if (a.type === "rule" || a.type === "pagebreak") {
    const marker = a.type === "rule" ? "---" : "::: pagebreak";
    return block(
      marker + (selected ? "\n\n" + selected : ""),
      selected ? marker.length + 2 : marker.length,
      selected.length,
    );
  }
  const start = from === 0 ? 0 : doc.lastIndexOf("\n", from - 1) + 1;
  const last = to > from && doc[to - 1] === "\n" ? to - 1 : to;
  const next = doc.indexOf("\n", last),
    end = next < 0 ? doc.length : next;
  const lines = doc.slice(start, end).split("\n");
  const listPattern = /^([ \t]*)([-+*]|\d+[.)])\s+(?:\[([ xX])\]\s+)?(.*)$/;
  const listKind = (line: string) => {
    const m = listPattern.exec(line);
    return !m
      ? ""
      : m[3] !== undefined
        ? "task"
        : /^\d/.test(m[2])
          ? "ordered"
          : "bullet";
  };
  const relevant = lines.filter((l) => l.trim());
  const toggleOff =
    ["bullet", "ordered", "task"].includes(a.type) &&
    relevant.length > 0 &&
    relevant.every((l) => listKind(l) === a.type);
  const unquote =
    a.type === "quote" &&
    relevant.length > 0 &&
    relevant.every((l) => /^[ \t]*> ?/.test(l));
  const counters = new Map<string, number>();
  const changed = lines
    .map((line) => {
      if (!line.trim() && lines.length > 1) return line;
      const indent = /^[ \t]*/.exec(line)![0],
        text = line.slice(indent.length);
      if (a.type === "indent") return "  " + line;
      if (a.type === "outdent") return line.replace(/^(?: {1,2}|\t)/, "");
      if (a.type === "heading") {
        if (!Number.isInteger(a.level) || a.level < 0 || a.level > 6)
          throw new Error("标题级别必须为 0–6");
        const old = /^(#{1,6})\s+/.exec(text),
          body = text.replace(/^#{1,6}\s+/, "") || "标题";
        const level = old?.[1].length === a.level ? 0 : a.level;
        return indent + (level ? "#".repeat(level) + " " : "") + body;
      }
      if (a.type === "quote")
        return (
          indent +
          (unquote ? text.replace(/^> ?/, "") : "> " + (text || "引用内容"))
        );
      const m = listPattern.exec(line),
        body = m ? m[4] : text || "列表项";
      if (toggleOff) return indent + body;
      if (a.type === "bullet") return indent + "- " + body;
      if (a.type === "task")
        return (
          indent + `- [${m?.[3]?.toLowerCase() === "x" ? "x" : " "}] ` + body
        );
      const n = (counters.get(indent) || 0) + 1;
      counters.set(indent, n);
      return indent + n + ". " + body;
    })
    .join("\n");
  if (from !== to)
    return edit(start, end, changed, start, start + changed.length);
  if (!doc.slice(start, end).trim()) {
    const bodyOffset =
      a.type === "heading"
        ? changed.indexOf("标题")
        : a.type === "quote"
          ? changed.indexOf("引用内容")
          : changed.indexOf("列表项");
    if (bodyOffset >= 0)
      return edit(
        start,
        end,
        changed,
        start + bodyOffset,
        start + changed.length,
      );
  }
  const delta = changed.length - (end - start),
    cursor = Math.max(start, Math.min(start + changed.length, from + delta));
  return edit(start, end, changed, cursor, cursor);
}
