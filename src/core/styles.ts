import { validateOptions, type Options } from "./model.js";
export const palettes = {
  manual: {
    accent: "#3659d9",
    ink: "#243048",
    muted: "#69748a",
    line: "#dde3ef",
    soft: "#f0f3fc",
  },
  editorial: {
    accent: "#a24c32",
    ink: "#342b28",
    muted: "#81716a",
    line: "#e9ddd5",
    soft: "#fbf2eb",
  },
  report: {
    accent: "#176a60",
    ink: "#223c38",
    muted: "#627c77",
    line: "#d8e7e2",
    soft: "#eff7f3",
  },
};
export function documentCss(value: Options) {
  const o = validateOptions(value),
    p = palettes[o.theme];
  return `
.paper{--accent:${p.accent};--ink:${p.ink};--muted:${p.muted};--line:${p.line};--soft:${p.soft};background:#fff;color:var(--ink);font-family:${o.theme === "editorial" ? 'Georgia,"Noto Serif SC","Songti SC",serif' : '"Noto Sans SC","PingFang SC","Microsoft YaHei",system-ui,sans-serif'};font-size:${o.fontSize + 3}px;line-height:1.95;overflow-wrap:anywhere;}
.paper *{box-sizing:border-box}.paper h1,.paper h2,.paper h3,.paper h4,.paper h5,.paper h6{line-height:1.4;break-after:avoid;scroll-margin-top:26px;color:var(--ink)}
.paper h1{font-size:2.55em;letter-spacing:-.045em;margin:.1em 0 .7em;line-height:1.28;font-weight:750}.paper h2{font-size:1.52em;margin:2em 0 .8em;letter-spacing:-.025em;border-bottom:1px solid var(--line);padding-bottom:.45em}.paper h3{font-size:1.15em;margin:1.6em 0 .6em;color:var(--accent)}
.paper p{margin:.7em 0 1em}.paper a{color:var(--accent);text-underline-offset:3px}.paper strong{font-weight:750}.paper .task-item{list-style:none}.paper .task-checkbox{margin:0 .55em 0 -1.2em;accent-color:var(--accent);width:13px;height:13px;vertical-align:middle;opacity:1}.paper ul,.paper ol{padding-left:1.5em}.paper li{margin:.3em 0}.paper blockquote{border-left:3px solid var(--accent);margin:1.4em 0;padding:.5em 1.2em;background:var(--soft);color:var(--ink);border-radius:0 6px 6px 0}.paper blockquote p{margin:.2em 0}
.paper code{font-family:"SFMono-Regular",Consolas,"Liberation Mono",monospace;background:var(--soft);border-radius:4px;padding:.15em .35em;font-size:.85em;color:var(--accent);white-space:pre-wrap;overflow-wrap:anywhere}.paper pre{padding:20px;border:1px solid var(--line);border-radius:8px;background:#f7f8fb;line-height:1.65;overflow-x:auto;font-size:.93em;tab-size:2}.paper pre code{padding:0;background:none;color:#33415c;white-space:pre;overflow-wrap:normal}.paper .hljs-keyword,.paper .hljs-selector-tag{color:#7958b6}.paper .hljs-string,.paper .hljs-attr{color:#137e71}.paper .hljs-comment{color:#7c8799}.paper .hljs-title,.paper .hljs-number{color:#bd5a37}
.paper table{border-collapse:collapse;width:100%;font-size:.9em;margin:1.4em 0;display:block;overflow-x:auto}.paper td,.paper th{padding:10px 13px;border:1px solid var(--line);text-align:left;min-width:65px}.paper th{background:var(--soft);color:var(--accent);font-weight:650}.paper tr:nth-child(even){background:#fafbfc}.paper img{max-width:100%;height:auto;border-radius:6px;display:block;margin:1em auto}.paper hr{border:0;border-top:1px solid var(--line);margin:2em 0}.paper .media-placeholder{display:block;border:1px dashed var(--line);border-radius:6px;padding:16px;color:var(--muted)}.paper .media-placeholder small{display:block;font-size:11px}.paper .pagebreak{border-top:1px dashed var(--line);text-align:center;margin:2em 0;color:var(--muted);font-size:10px;break-before:page}.paper .doc-toc{border:1px solid var(--line);padding:20px 26px;background:var(--soft);border-radius:8px;margin-bottom:2em}.paper .doc-toc ol{list-style:none;padding:0;margin:8px 0 0}.paper .doc-toc a{text-decoration:none;font-size:.9em}.paper .doc-toc li{margin:.3em 0}.paper[data-layout="editorial"] h1{font-size:2.9em;font-weight:600}.paper[data-layout="editorial"] h2{border:0}.paper[data-layout="report"] h1{border-top:5px solid var(--accent);padding-top:.6em}.paper .doc-kicker{font:600 10px/1.5 system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);margin-bottom:22px}.paper .doc-end{border-top:1px solid var(--line);margin-top:3em;padding-top:14px;color:var(--muted);font:10px system-ui,sans-serif;display:flex;justify-content:space-between}
@media print{.paper{font-size:${o.fontSize}pt}.paper pre{white-space:pre-wrap;overflow:visible}.paper pre code{white-space:pre-wrap;overflow-wrap:anywhere}.paper table{display:table;table-layout:fixed}.paper td,.paper th{min-width:0}.paper .pagebreak{border:0;margin:0;height:0}.paper .pagebreak span{display:none}.paper img{break-inside:avoid;max-height:22cm}.paper .doc-end{display:none} @page{size:${o.pageSize === "A4" ? "A4" : "letter"};margin:18mm}}
`;
}
