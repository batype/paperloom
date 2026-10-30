export type Theme = "manual" | "editorial" | "report";
export interface Options {
  theme: Theme;
  fontSize: number;
  pageSize: "A4" | "LETTER";
  toc: boolean;
  footer: boolean;
}
export const DEFAULT_OPTIONS: Options = {
  theme: "manual",
  fontSize: 11,
  pageSize: "A4",
  toc: false,
  footer: true,
};
export const MAX_BYTES = 4 * 1024 * 1024;
export const MAX_LINES = 12000;
export interface Heading {
  id: string;
  text: string;
  level: number;
  line: number;
}
export interface Issue {
  kind: "warning" | "info";
  message: string;
  line: number;
  code: string;
}
export interface Compilation {
  html: string;
  headings: Heading[];
  issues: Issue[];
  title: string;
  characters: number;
  readingMinutes: number;
}
export function validateOptions(value: unknown): Options {
  if (!value || typeof value !== "object")
    throw new Error("排版配置格式不正确");
  const o = value as Record<string, unknown>;
  if (
    !["manual", "editorial", "report"].includes(String(o.theme)) ||
    ![10, 11, 12].includes(Number(o.fontSize)) ||
    !["A4", "LETTER"].includes(String(o.pageSize)) ||
    typeof o.toc !== "boolean" ||
    typeof o.footer !== "boolean"
  )
    throw new Error("排版配置的值不在支持范围内");
  return {
    theme: o.theme as Theme,
    fontSize: Number(o.fontSize),
    pageSize: o.pageSize as Options["pageSize"],
    toc: o.toc,
    footer: o.footer,
  };
}
export function checkInput(source: string) {
  if (new TextEncoder().encode(source).length > MAX_BYTES)
    throw new Error("文档超过 4 MiB，请拆分后再编辑");
  if (source.split("\n").length > MAX_LINES)
    throw new Error("文档超过 12,000 行，请拆分后再编辑");
}
export function filename(value: string) {
  return (
    value
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
      .replace(/^[.\s]+|[.\s]+$/g, "")
      .slice(0, 80) || "untitled"
  );
}
