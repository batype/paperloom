import { tocHtml } from "./toc.js";
import { compile, md } from "./compile.js";
import { documentCss } from "./styles.js";
import { validateOptions, type Options, type Compilation } from "./model.js";
export function exportHtml(source: string, value: Options) {
  const o = validateOptions(value),
    c = compile(source);
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${md.utils.escapeHtml(c.title)}</title><style>${documentCss(o)}body{margin:0;background:#f2f3f5}.paper{max-width:880px;margin:32px auto;padding:64px 72px;min-height:90vh}@media(max-width:600px){.paper{margin:0;padding:30px 22px}}@media print{body{background:white}.paper{margin:0;padding:0;max-width:none;min-height:0}}</style></head><body><main class="paper" data-layout="${o.theme}">${o.toc ? tocHtml(c) : ""}${c.html}${o.footer ? '<footer class="doc-end"><span>Paperloom · 墨页</span><span>MARKDOWN → DOCUMENT</span></footer>' : ""}</main></body></html>`;
}
