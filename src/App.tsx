import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  Code2,
  Columns2,
  Download,
  Eye,
  FileCode2,
  FileText,
  Github,
  Heading2,
  ImagePlus,
  Link,
  Link2,
  List,
  ListChecks,
  LoaderCircle,
  Maximize2,
  Monitor,
  Moon,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Quote,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sun,
  Table2,
  Type,
  X,
} from "lucide-react";
import { Editor, type EditorHandle } from "./ui/Editor";
import { Modal } from "./ui/Modal";
import { useCompiler } from "./ui/useCompiler";
import {
  DEFAULT_OPTIONS,
  checkInput,
  filename,
  validateOptions,
  type Options,
} from "./core/model";
import { templates } from "./core/templates";
import { documentCss } from "./core/styles";
import { tocHtml } from "./core/toc";
const STORE = "paperloom.draft.v1",
  PREF = "paperloom.preferences.v1";
function load() {
  try {
    const p = JSON.parse(localStorage.getItem(PREF) || "{}");
    const d =
      p.autosave === false
        ? null
        : JSON.parse(localStorage.getItem(STORE) || "null");
    if (d?.version === 1 && typeof d.source === "string") {
      checkInput(d.source);
      return {
        source: d.source,
        options: validateOptions(d.options),
        name: typeof d.name === "string" ? d.name : "document",
        restored: true,
      };
    }
  } catch {}
  return {
    source: templates[0].source,
    options: { ...DEFAULT_OPTIONS },
    name: "我的第一份文档",
    restored: false,
  };
}
function prefs(): { theme?: "light" | "dark" | "system"; autosave?: boolean } {
  try {
    const p = JSON.parse(localStorage.getItem(PREF) || "{}");
    if (!p || typeof p !== "object" || Array.isArray(p)) return {};
    return {
      theme: ["light", "dark", "system"].includes(p.theme) ? p.theme : "system",
      autosave: typeof p.autosave === "boolean" ? p.autosave : true,
    };
  } catch {
    return {};
  }
}
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export default function App() {
  const [initial] = useState(load),
    [source, setSource] = useState(initial.source),
    [options, setOptions] = useState<Options>(initial.options),
    [name, setName] = useState(initial.name),
    [theme, setTheme] = useState<"light" | "dark" | "system">(
      () => prefs().theme || "system",
    ),
    [systemDark, setSystemDark] = useState(
      () => matchMedia("(prefers-color-scheme: dark)").matches,
    ),
    [autosave, setAutosave] = useState(() => prefs().autosave !== false),
    [saveStatus, setSaveStatus] = useState(
      initial.restored ? "已恢复本地草稿" : "草稿仅保存在此浏览器",
    );
  const [mode, setMode] = useState<"split" | "edit" | "preview">("split"),
    [sidebar, setSidebar] = useState(true),
    [sideTab, setSideTab] = useState<"style" | "outline" | "check">("style"),
    [previewTab, setPreviewTab] = useState<"read" | "pdf">("read"),
    [modal, setModal] = useState<
      "" | "export" | "templates" | "guide" | "privacy"
    >(""),
    [format, setFormat] = useState<"pdf" | "html" | "md">("pdf"),
    [toast, setToast] = useState(""),
    [previous, setPrevious] = useState<{
      source: string;
      options: Options;
      name: string;
    } | null>(null),
    [exportBusy, setExportBusy] = useState(false),
    [pdfBusy, setPdfBusy] = useState(false),
    [pdfProgress, setPdfProgress] = useState(""),
    [pdfUrl, setPdfUrl] = useState("");
  const editor = useRef<EditorHandle>(null),
    preview = useRef<HTMLDivElement>(null),
    file = useRef<HTMLInputElement>(null),
    image = useRef<HTMLInputElement>(null),
    pdfWorker = useRef<Worker | null>(null),
    pdfBlob = useRef<Blob | null>(null),
    pdfTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    pdfBusyRef = useRef(false),
    pdfUrlRef = useRef("");
  const { result, error, busy, fresh } = useCompiler(source);
  const dark = theme === "dark" || (theme === "system" && systemDark),
    warnings = result?.issues.filter((i) => i.kind === "warning").length || 0;
  const status = (text: string) => setToast(text);
  useEffect(() => {
    const m = matchMedia("(prefers-color-scheme: dark)");
    const fn = () => setSystemDark(m.matches);
    m.addEventListener("change", fn);
    return () => m.removeEventListener("change", fn);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    try {
      localStorage.setItem(PREF, JSON.stringify({ theme, autosave }));
    } catch {}
  }, [dark, theme, autosave]);
  useEffect(() => {
    if (!autosave) {
      try {
        localStorage.removeItem(STORE);
      } catch {}
      setSaveStatus("本地草稿已关闭");
      return;
    }
    setSaveStatus("正在保存…");
    const t = setTimeout(() => {
      try {
        localStorage.setItem(
          STORE,
          JSON.stringify({ version: 1, source, options, name }),
        );
        setSaveStatus("已保存到此浏览器");
      } catch {
        setSaveStatus("本地空间不足，请下载 MD 保存");
      }
    }, 700);
    return () => clearTimeout(t);
  }, [source, options, name, autosave]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        download(
          new Blob([source], { type: "text/markdown;charset=utf-8" }),
          filename(name) + ".md",
        );
        status("Markdown 已下载");
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [source, name]);
  function cancelPdf(notify = true) {
    pdfWorker.current?.terminate();
    pdfWorker.current = null;
    if (pdfTimer.current) clearTimeout(pdfTimer.current);
    pdfBusyRef.current = false;
    setPdfBusy(false);
    if (notify) status("已取消 PDF 生成");
  }
  useEffect(() => {
    if (pdfBusyRef.current) cancelPdf(false);
    pdfBlob.current = null;
    if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    pdfUrlRef.current = "";
    setPdfUrl("");
  }, [source, options]);
  useEffect(
    () => () => {
      pdfWorker.current?.terminate();
      if (pdfTimer.current) clearTimeout(pdfTimer.current);
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    },
    [],
  );
  function change(v: string) {
    try {
      checkInput(v);
      setSource(v);
    } catch (e) {
      status((e as Error).message);
    }
  }
  function jump(line: number, id?: string) {
    if (mode === "preview") setMode("split");
    setTimeout(() => editor.current?.jump(line), 30);
    if (id) {
      const el = document.getElementById(id);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  function option<K extends keyof Options>(key: K, value: Options[K]) {
    setOptions((o) => ({ ...o, [key]: value }));
  }
  function replaceDocument(
    text: string,
    newName: string,
    newOptions = options,
  ) {
    setPrevious({ source, options, name });
    setSource(text);
    setName(newName);
    setOptions(newOptions);
    setPreviewTab("read");
    setModal("");
    status("已载入文档，可撤销替换");
  }
  async function importFile(f?: File) {
    if (!f) return;
    try {
      if (!/\.(md|markdown|txt)$/i.test(f.name))
        throw new Error("请选择 .md、.markdown 或 .txt 文件");
      if (f.size > 4 * 1024 * 1024) throw new Error("文件超过 4 MiB");
      const text = new TextDecoder("utf-8", { fatal: true }).decode(
        await f.arrayBuffer(),
      );
      checkInput(text);
      replaceDocument(text, f.name.replace(/\.[^.]+$/, ""));
    } catch (e) {
      status((e as Error).message);
    }
  }
  async function insertImage(f?: File) {
    if (!f) return;
    try {
      if (!["image/png", "image/jpeg"].includes(f.type))
        throw new Error("插图支持 PNG 和 JPEG");
      if (f.size > 2 * 1024 * 1024) throw new Error("单张图片不能超过 2 MiB");
      const url = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error("图片读取失败"));
        r.readAsDataURL(f);
      });
      const im = new window.Image();
      im.src = url;
      await im.decode();
      if (im.width * im.height > 16000000)
        throw new Error("图片不能超过 1600 万像素，请缩小后重试");
      checkInput(source + url + "\n\n![图片描述]()\n");
      editor.current?.insert(
        `\n\n![${f.name.replace(/[\[\]\\]/g, "")}](${url})\n\n`,
      );
      status("图片已嵌入文档，导出时会一起保留");
    } catch (e) {
      status((e as Error).message);
    }
  }
  function generatePdf(intent: "download" | "preview") {
    if (!fresh || pdfBusyRef.current) return;
    if (pdfBlob.current) {
      if (intent === "download") {
        download(pdfBlob.current, filename(name) + ".pdf");
        status("PDF 已下载");
        setModal("");
      } else setPreviewTab("pdf");
      return;
    }
    pdfBusyRef.current = true;
    setPdfBusy(true);
    setPdfProgress("启动 PDF 排版引擎…");
    if (intent === "preview") setPreviewTab("pdf");
    const worker = new Worker(
      new URL("./workers/pdf.worker.ts", import.meta.url),
      { type: "module" },
    );
    pdfWorker.current = worker;
    const fail = (message: string) => {
      cancelPdf(false);
      status(message);
      setPdfProgress(message);
    };
    pdfTimer.current = setTimeout(
      () => fail("PDF 生成超过 60 秒，请减少图片或拆分文档后重试"),
      60000,
    );
    worker.onerror = () => fail("PDF 引擎未能完成排版，请检查内容后重试");
    worker.onmessage = (e) => {
      if (e.data.progress) {
        setPdfProgress(e.data.progress);
        return;
      }
      if (e.data.error) {
        fail(e.data.error);
        return;
      }
      if (e.data.buffer) {
        const blob = new Blob([e.data.buffer], { type: "application/pdf" });
        pdfBlob.current = blob;
        const url = URL.createObjectURL(blob);
        pdfUrlRef.current = url;
        setPdfUrl(url);
        cancelPdf(false);
        setPdfProgress("PDF 校样已生成");
        if (intent === "download") {
          download(blob, filename(name) + ".pdf");
          setModal("");
          status("PDF 已下载 · 文字可选择和搜索");
        } else status("PDF 校样已生成");
      }
    };
    worker.postMessage({
      source,
      options,
      base: new URL(import.meta.env.BASE_URL, location.origin).href,
    });
  }
  async function exportDocument() {
    if (format === "pdf") {
      generatePdf("download");
      return;
    }
    if (format === "md") {
      download(
        new Blob([source], { type: "text/markdown;charset=utf-8" }),
        filename(name) + ".md",
      );
      setModal("");
      status("原始 Markdown 已下载");
      return;
    }
    setExportBusy(true);
    try {
      const text = await new Promise<string>((resolve, reject) => {
        const w = new Worker(
          new URL("./workers/html.worker.ts", import.meta.url),
          { type: "module" },
        );
        const t = setTimeout(() => {
          w.terminate();
          reject(new Error("HTML 导出超时，请精简内容"));
        }, 6000);
        w.onmessage = (e) => {
          clearTimeout(t);
          w.terminate();
          e.data.error ? reject(new Error(e.data.error)) : resolve(e.data.html);
        };
        w.onerror = () => {
          clearTimeout(t);
          w.terminate();
          reject(new Error("HTML 导出失败"));
        };
        w.postMessage({ source, options });
      });
      download(
        new Blob([text], { type: "text/html;charset=utf-8" }),
        filename(name) + ".html",
      );
      setModal("");
      status("独立 HTML 已下载");
    } catch (e) {
      status((e as Error).message);
    } finally {
      setExportBusy(false);
    }
  }
  const themes = [
    {
      id: "manual",
      title: "技术手册",
      caption: "清晰 · 有条理",
      sample: "Aa",
      color: "#4263eb",
    },
    {
      id: "editorial",
      title: "杂志文章",
      caption: "留白 · 讲故事",
      sample: "Aa",
      color: "#a24c32",
    },
    {
      id: "report",
      title: "正式报告",
      caption: "克制 · 可交付",
      sample: "Aa",
      color: "#176a60",
    },
  ] as const;
  return (
    <>
      <a href="#workspace" className="skip">
        跳到工作台
      </a>
      <header className="app-header">
        <a className="brand" href="#" aria-label="Paperloom 墨页首页">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" />
          <span>
            Paperloom<small>墨页</small>
          </span>
        </a>
        <nav className="main-nav">
          <button className="active" onClick={() => setModal("")}>
            工作台
          </button>
          <button onClick={() => setModal("guide")}>
            使用指南 <ArrowUpRight size={12} />
          </button>
        </nav>
        <div className="header-actions">
          <span className="local-badge">
            <span /> 本地排版，不上传正文
          </span>
          <button
            className="icon-btn"
            title={`界面主题：${theme === "system" ? "跟随系统" : theme === "dark" ? "暗色" : "亮色"}`}
            aria-label="切换界面亮暗主题"
            onClick={() =>
              setTheme(
                theme === "system"
                  ? "light"
                  : theme === "light"
                    ? "dark"
                    : "system",
              )
            }
          >
            {theme === "dark" ? (
              <Moon size={17} />
            ) : theme === "light" ? (
              <Sun size={17} />
            ) : (
              <Monitor size={17} />
            )}
          </button>
          <a
            className="icon-btn github"
            href="https://github.com/batype/paperloom"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub 源码"
          >
            <Github size={18} />
          </a>
          <button
            className="primary header-export"
            disabled={!fresh || pdfBusy}
            onClick={() => setModal("export")}
          >
            <ArrowDownToLine size={15} /> 导出文档
          </button>
        </div>
      </header>
      <main id="workspace" tabIndex={-1}>
        <section className="intro">
          <div>
            <div className="eyebrow">
              FROM MARKDOWN TO SOMETHING WORTH SHARING
            </div>
            <h1>
              写下想法，<em>交付作品。</em>
            </h1>
            <p>同一份 Markdown，三种表达。让文档的最后一公里，也轻松一点。</p>
          </div>
          <button
            className="template-entry"
            onClick={() => setModal("templates")}
          >
            <span className="mini-sheets">
              <i />
              <i />
              <i />
            </span>
            <span>
              从一份好模板开始<small>技术手册 / 经验文章 / 方案报告</small>
            </span>
            <ArrowUpRight size={17} />
          </button>
        </section>
        <section
          className={`workbench mode-${mode} ${sidebar ? "" : "no-sidebar"}`}
          aria-label="Markdown 工作台"
        >
          <div className="document-bar">
            <div className="document-name">
              <FileText size={16} />
              <input
                aria-label="导出文件名"
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
              />
              <span className="extension">.md</span>
              <span className="save-state">
                <span />
                {saveStatus}
              </span>
            </div>
            <div className="document-actions">
              {previous && (
                <button
                  onClick={() => {
                    const p = previous;
                    setSource(p.source);
                    setOptions(p.options);
                    setName(p.name);
                    setPrevious(null);
                    status("已恢复替换前的文档");
                  }}
                >
                  <RotateCcw size={13} />
                  撤销替换
                </button>
              )}
              <button onClick={() => file.current?.click()}>
                <ArrowUpFromLine size={14} />
                导入
              </button>
              <button onClick={() => replaceDocument("", "未命名文档")}>
                <Plus size={14} />
                新建
              </button>
              <div className="layout-switch" role="group" aria-label="编辑布局">
                <button
                  aria-label="仅编辑"
                  title="仅编辑"
                  className={mode === "edit" ? "selected" : ""}
                  onClick={() => setMode("edit")}
                >
                  <Code2 size={15} />
                </button>
                <button
                  aria-label="分屏"
                  title="分屏"
                  className={mode === "split" ? "selected" : ""}
                  onClick={() => setMode("split")}
                >
                  <Columns2 size={15} />
                </button>
                <button
                  aria-label="仅预览"
                  title="仅预览"
                  className={mode === "preview" ? "selected" : ""}
                  onClick={() => setMode("preview")}
                >
                  <Eye size={15} />
                </button>
              </div>
              <button
                className="icon-btn"
                aria-label={sidebar ? "收起排版面板" : "展开排版面板"}
                onClick={() => setSidebar(!sidebar)}
              >
                {sidebar ? (
                  <PanelRightClose size={16} />
                ) : (
                  <PanelRightOpen size={16} />
                )}
              </button>
            </div>
          </div>
          <div className="editor-pane">
            <div className="pane-head">
              <span>
                <span className="source-dot" /> MARKDOWN
              </span>
              <span className="pane-hint">⌘ / Ctrl + S 保存 MD</span>
            </div>
            <div className="format-bar">
              <button
                title="二级标题"
                aria-label="插入二级标题"
                onClick={() => editor.current?.insert("\n## ")}
              >
                <Heading2 size={16} />
              </button>
              <button
                title="粗体"
                aria-label="插入粗体"
                className="bold-tool"
                onClick={() => editor.current?.insert("**", "**")}
              >
                B
              </button>
              <button
                title="链接"
                aria-label="插入链接"
                onClick={() => editor.current?.insert("[链接文字](", ")")}
              >
                <Link size={15} />
              </button>
              <button
                title="引用"
                aria-label="插入引用"
                onClick={() => editor.current?.insert("\n> ")}
              >
                <Quote size={15} />
              </button>
              <button
                title="代码块"
                aria-label="插入代码块"
                onClick={() =>
                  editor.current?.insert("\n```typescript\n", "\n```\n")
                }
              >
                <Code2 size={16} />
              </button>
              <button
                title="表格"
                aria-label="插入表格"
                onClick={() =>
                  editor.current?.insert(
                    "\n| 标题 | 内容 |\n| --- | --- |\n| 项目 | 说明 |\n",
                  )
                }
              >
                <Table2 size={15} />
              </button>
              <button
                title="嵌入本地 PNG / JPEG"
                aria-label="插入本地图片"
                onClick={() => image.current?.click()}
              >
                <ImagePlus size={15} />
              </button>
              <span className="tool-divider" />
              <button
                className="break-tool"
                title="PDF 中强制另起一页"
                onClick={() => editor.current?.insert("\n\n::: pagebreak\n\n")}
              >
                插入分页
              </button>
            </div>
            <div className="editor-area">
              <Editor
                ref={editor}
                value={source}
                onChange={change}
                dark={dark}
              />
            </div>
            <div className="pane-footer">
              <span>{source.split("\n").length.toLocaleString()} 行</span>
              <span>UTF-8 · Markdown</span>
            </div>
          </div>
          <div className="preview-pane">
            <div className="pane-head preview-head">
              <div className="preview-tabs">
                <button
                  className={previewTab === "read" ? "active" : ""}
                  onClick={() => setPreviewTab("read")}
                >
                  <Eye size={13} />
                  阅读预览
                </button>
                <button
                  className={previewTab === "pdf" ? "active" : ""}
                  onClick={() => setPreviewTab("pdf")}
                >
                  <FileText size={13} />
                  PDF 校样
                </button>
              </div>
              <span className="live-label">
                {busy ? (
                  <>
                    <LoaderCircle size={11} className="spin" />
                    排版中
                  </>
                ) : (
                  <>
                    <span />
                    实时
                  </>
                )}
              </span>
            </div>
            {previewTab === "read" ? (
              <div
                className="preview-scroll"
                ref={preview}
                onClick={(e) => {
                  const a = (e.target as HTMLElement).closest("a");
                  if (a?.getAttribute("href")?.startsWith("#")) {
                    e.preventDefault();
                    document
                      .getElementById(a.getAttribute("href")!.slice(1))
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
              >
                <div className="paper-info">
                  <span>
                    {options.theme === "manual"
                      ? "DOCUMENTATION"
                      : options.theme === "editorial"
                        ? "THE EDITORIAL"
                        : "PROJECT REPORT"}
                  </span>
                  <span>
                    {options.pageSize === "A4" ? "A4" : "Letter"} · 阅读预览
                  </span>
                </div>
                <style>{documentCss(options)}</style>
                <article
                  className={`paper ${busy ? "updating" : ""}`}
                  data-layout={options.theme}
                >
                  <div className="doc-kicker">
                    {options.theme === "manual"
                      ? "NOTES, IDEAS & DOCUMENTATION"
                      : options.theme === "editorial"
                        ? "A LITTLE ROOM FOR GOOD IDEAS"
                        : "CLARITY IS A FORM OF RESPECT"}
                  </div>
                  {error ? (
                    <div className="preview-error">{error}</div>
                  ) : (
                    <>
                      {options.toc && result && (
                        <div
                          dangerouslySetInnerHTML={{ __html: tocHtml(result) }}
                        />
                      )}
                      <div
                        dangerouslySetInnerHTML={{
                          __html:
                            result?.html ||
                            '<p class="empty-document">从一个 # 标题开始，写下你的第一行。</p>',
                        }}
                      />
                      {options.footer && (
                        <footer className="doc-end">
                          <span>Paperloom · 墨页</span>
                          <span>THOUGHTFULLY WRITTEN.</span>
                        </footer>
                      )}
                    </>
                  )}
                </article>
                <div className="paper-note">
                  阅读预览不模拟分页 · 最终分页请查看 PDF 校样
                </div>
              </div>
            ) : (
              <div className="pdf-pane">
                {pdfUrl ? (
                  <iframe title="真实 PDF 校样" src={`${pdfUrl}#view=FitH`} />
                ) : (
                  <div className="pdf-empty">
                    <div className="pdf-icon">
                      <FileText size={32} />
                    </div>
                    <h3>
                      {pdfBusy ? "正在织成一份文档…" : "先看校样，再交付"}
                    </h3>
                    <p>
                      {pdfBusy
                        ? pdfProgress
                        : "用真正的 PDF 检查分页、中文、表格与代码。\n生成过程在当前浏览器内完成。"}
                    </p>
                    {pdfBusy ? (
                      <button className="secondary" onClick={() => cancelPdf()}>
                        取消生成
                      </button>
                    ) : (
                      <button
                        className="primary"
                        disabled={!fresh}
                        onClick={() => generatePdf("preview")}
                      >
                        <Eye size={15} />
                        生成 PDF 校样
                      </button>
                    )}
                    <small>
                      首次生成需加载约 21 MB 中文字体，之后浏览器可缓存。
                    </small>
                  </div>
                )}
              </div>
            )}
            <div className="pane-footer">
              <span>
                {result?.characters.toLocaleString() || 0} 正文字符 · 约{" "}
                {result?.readingMinutes || 1} 分钟阅读
              </span>
              {previewTab === "pdf" && pdfUrl ? (
                <button
                  onClick={() => {
                    download(pdfBlob.current!, filename(name) + ".pdf");
                    status("PDF 已下载");
                  }}
                >
                  下载此 PDF <Download size={12} />
                </button>
              ) : (
                <span>样式与界面亮暗独立</span>
              )}
            </div>
          </div>
          {sidebar && (
            <aside className="inspector">
              <div
                className="inspector-tabs"
                role="tablist"
                aria-label="文档面板"
              >
                <button
                  id="inspector-style"
                  aria-controls="inspector-panel"
                  role="tab"
                  aria-selected={sideTab === "style"}
                  className={sideTab === "style" ? "active" : ""}
                  onClick={() => setSideTab("style")}
                >
                  <Settings2 size={13} />
                  排版
                </button>
                <button
                  id="inspector-outline"
                  aria-controls="inspector-panel"
                  role="tab"
                  aria-selected={sideTab === "outline"}
                  className={sideTab === "outline" ? "active" : ""}
                  onClick={() => setSideTab("outline")}
                >
                  <List size={14} />
                  目录
                </button>
                <button
                  id="inspector-check"
                  aria-controls="inspector-panel"
                  role="tab"
                  aria-selected={sideTab === "check"}
                  className={sideTab === "check" ? "active" : ""}
                  onClick={() => setSideTab("check")}
                >
                  <ListChecks size={14} />
                  检查{warnings > 0 && <b>{warnings}</b>}
                </button>
              </div>
              <div
                className="inspector-content"
                role="tabpanel"
                id="inspector-panel"
                aria-labelledby={`inspector-${sideTab}`}
              >
                {sideTab === "style" ? (
                  <>
                    <div className="section-label">
                      文档风格 <span>01 / LOOK & FEEL</span>
                    </div>
                    <div className="theme-list">
                      {themes.map((t) => (
                        <button
                          key={t.id}
                          className={`theme-card ${options.theme === t.id ? "active" : ""}`}
                          onClick={() => option("theme", t.id)}
                          aria-pressed={options.theme === t.id}
                        >
                          <span
                            className={`theme-sample ${t.id}`}
                            style={{ color: t.color }}
                          >
                            {t.sample}
                            <i />
                            <i />
                          </span>
                          <span>
                            <strong>{t.title}</strong>
                            <small>{t.caption}</small>
                          </span>
                          {options.theme === t.id ? (
                            <Check size={15} />
                          ) : (
                            <span className="theme-radio" />
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="section-label spacing">
                      阅读节奏 <span>02 / TYPOGRAPHY</span>
                    </div>
                    <div className="setting-caption">正文字号</div>
                    <div className="segmented">
                      {[
                        { v: 10, n: "紧凑" },
                        { v: 11, n: "标准" },
                        { v: 12, n: "舒展" },
                      ].map((s) => (
                        <button
                          key={s.v}
                          className={options.fontSize === s.v ? "active" : ""}
                          onClick={() => option("fontSize", s.v)}
                        >
                          {s.n}
                        </button>
                      ))}
                    </div>
                    <label className="select-setting">
                      纸张规格
                      <select
                        value={options.pageSize}
                        onChange={(e) =>
                          option(
                            "pageSize",
                            e.target.value as Options["pageSize"],
                          )
                        }
                      >
                        <option value="A4">A4 · 210 × 297 mm</option>
                        <option value="LETTER">Letter · 216 × 279 mm</option>
                      </select>
                    </label>
                    <div className="toggle-row">
                      <span>
                        文首目录<small>HTML 和 PDF 一起生效</small>
                      </span>
                      <input
                        aria-label="文首目录"
                        type="checkbox"
                        role="switch"
                        checked={options.toc}
                        onChange={(e) => option("toc", e.target.checked)}
                      />
                    </div>
                    <div className="toggle-row">
                      <span>
                        文档页脚<small>PDF 附带页码</small>
                      </span>
                      <input
                        aria-label="文档页脚"
                        type="checkbox"
                        role="switch"
                        checked={options.footer}
                        onChange={(e) => option("footer", e.target.checked)}
                      />
                    </div>
                    <div className="inspector-tip">
                      <ShieldCheck size={16} />
                      <p>
                        你的内容，你来保管。
                        <br />
                        <span>排版与导出均在本地完成。</span>
                      </p>
                    </div>
                  </>
                ) : sideTab === "outline" ? (
                  <>
                    <div className="section-label">
                      文档结构{" "}
                      <span>{result?.headings.length || 0} 个标题</span>
                    </div>
                    <p className="small-note">点击标题，定位到源码和预览。</p>
                    <div className="outline-list">
                      {result?.headings.length ? (
                        result.headings.map((h) => (
                          <button
                            key={h.id}
                            style={{ paddingLeft: 10 + (h.level - 1) * 12 }}
                            onClick={() => jump(h.line, h.id)}
                          >
                            <span>H{h.level}</span>
                            {h.text || "空标题"}
                          </button>
                        ))
                      ) : (
                        <p className="small-note">
                          输入 # 标题，目录就会出现在这里。
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className={`check-summary ${warnings ? "has-warning" : ""}`}
                    >
                      <CheckCheck size={23} />
                      <strong>
                        {warnings
                          ? `${warnings} 处值得看一眼`
                          : "没有发现交付问题"}
                      </strong>
                      <p>检查结构与资源，不替代内容审阅。</p>
                    </div>
                    {result?.issues.map((i, n) => (
                      <button
                        className={`issue ${i.kind}`}
                        key={n}
                        onClick={() => jump(i.line)}
                      >
                        <span>
                          {i.kind === "warning" ? "待检查" : "提示"} · 第{" "}
                          {i.line} 行
                        </span>
                        <p>{i.message}</p>
                        <ArrowUpRight size={12} />
                      </button>
                    ))}
                    <div className="small-note check-note">
                      外部图片不会自动加载。插入本地 PNG / JPEG
                      后，预览与导出都能带走图片。
                      <br />
                      <br />
                      原始 HTML、Mermaid 与数学公式不执行渲染。
                    </div>
                  </>
                )}
              </div>
              <button
                className="inspect-bottom"
                onClick={() => setModal("privacy")}
              >
                <ShieldCheck size={13} />
                草稿与隐私设置
                <ArrowUpRight size={12} />
              </button>
            </aside>
          )}
          <div className="workbench-status">
            <span>
              <span className="status-dot" />{" "}
              {error ? "文档需要调整" : fresh ? "已就绪" : "正在更新预览"}
            </span>
            <span>一个思考空间，三种交付格式。</span>
            <button
              onClick={() => {
                setSidebar(true);
                setSideTab("check");
              }}
            >
              {warnings ? `${warnings} 处待检查` : "交付检查"}{" "}
              <ArrowUpRight size={12} />
            </button>
          </div>
        </section>
        <footer className="site-footer">
          <span>PAPERLOOM / 墨页</span>
          <span>让好内容，被认真阅读。</span>
          <button onClick={() => setModal("guide")}>
            语法与使用说明 <ArrowUpRight size={12} />
          </button>
        </footer>
      </main>
      <input
        type="file"
        ref={file}
        accept=".md,.markdown,.txt"
        hidden
        onChange={(e) => {
          void importFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        type="file"
        ref={image}
        accept="image/png,image/jpeg"
        hidden
        onChange={(e) => {
          void insertImage(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {modal === "templates" && (
        <Modal title="从一份好模板开始" onClose={() => setModal("")} wide>
          <p className="modal-description">
            模板会替换当前内容。替换后可在工具栏撤销。
          </p>
          <div className="template-grid">
            {templates.map((t, n) => (
              <button
                key={t.id}
                className={`template-card template-${t.theme}`}
                onClick={() =>
                  replaceDocument(t.source, t.label, {
                    ...DEFAULT_OPTIONS,
                    theme: t.theme,
                  })
                }
              >
                <div className="template-preview">
                  <span>0{n + 1} / PAPERLOOM</span>
                  <h3>{t.label}</h3>
                  <i />
                  <i />
                  <i />
                  <div />
                  <i />
                  <i />
                </div>
                <strong>
                  {t.label}
                  <ArrowUpRight size={15} />
                </strong>
                <p>{t.description}</p>
              </button>
            ))}
          </div>
        </Modal>
      )}
      {modal === "export" && (
        <Modal
          title="把好文档带走"
          onClose={() => {
            if (pdfBusy) cancelPdf();
            setModal("");
          }}
        >
          <p className="modal-description">
            选择交付格式。排版样式会保留在 PDF 和 HTML 中。
          </p>
          <div className="export-formats">
            {[
              {
                id: "pdf",
                label: "PDF",
                desc: "可选择文字 · 自动分页",
                icon: FileText,
              },
              {
                id: "html",
                label: "HTML",
                desc: "独立网页 · 内嵌样式",
                icon: FileCode2,
              },
              {
                id: "md",
                label: "Markdown",
                desc: "完整原文 · 继续创作",
                icon: Code2,
              },
            ].map((f) => (
              <button
                key={f.id}
                className={format === f.id ? "active" : ""}
                disabled={pdfBusy || exportBusy}
                onClick={() => setFormat(f.id as typeof format)}
              >
                <f.icon size={23} />
                <strong>{f.label}</strong>
                <small>{f.desc}</small>
                {format === f.id && <Check size={14} />}
              </button>
            ))}
          </div>
          <label className="export-name">
            文件名
            <span>
              <input
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
              />
              <b>.{format}</b>
            </span>
          </label>
          {format === "pdf" && (
            <p className="export-note">
              PDF
              使用文字排版，不是页面截图。与阅读预览的字体和换行可能有差异，建议先生成校样。首次会加载约
              21 MB 中文字体。
            </p>
          )}
          {format === "html" && (
            <p className="export-note">
              无需 CDN 或脚本即可打开；嵌入的 PNG / JPEG
              会保留。阅读字体使用接收者的系统字体。
            </p>
          )}
          {warnings > 0 && (
            <button
              className="export-warning"
              onClick={() => {
                setModal("");
                setSidebar(true);
                setSideTab("check");
              }}
            >
              {warnings} 处待检查 · 查看详情 <ArrowUpRight size={13} />
            </button>
          )}
          <div className="modal-actions">
            <button
              className="secondary"
              onClick={() => {
                if (pdfBusy) cancelPdf();
                else setModal("");
              }}
            >
              {pdfBusy ? "取消生成" : "再检查一下"}
            </button>
            <button
              className="primary"
              disabled={!fresh || pdfBusy || exportBusy}
              onClick={() => void exportDocument()}
            >
              {pdfBusy || exportBusy ? (
                <LoaderCircle className="spin" size={15} />
              ) : (
                <Download size={15} />
              )}{" "}
              {pdfBusy
                ? pdfProgress
                : exportBusy
                  ? "生成 HTML…"
                  : `下载 ${format.toUpperCase()}`}
            </button>
          </div>
        </Modal>
      )}
      {modal === "privacy" && (
        <Modal title="草稿与隐私" onClose={() => setModal("")}>
          <div className="privacy-icon">
            <ShieldCheck size={28} />
          </div>
          <p className="modal-description">
            正文、排版和导出都在当前浏览器中处理，无需登录。页面会从本站加载程序与字体；不会为渲染文档自动访问外部图片地址。
          </p>
          <div className="toggle-row">
            <span>
              保存本地草稿
              <small>
                正文和排版设置保存在此浏览器。
                <br />
                关闭后立即删除已保存草稿，当前编辑内容仍保留。
              </small>
            </span>
            <input
              type="checkbox"
              role="switch"
              aria-label="保存本地草稿"
              checked={autosave}
              onChange={(e) => setAutosave(e.target.checked)}
            />
          </div>
          <p className="export-note">
            清理浏览器数据、切换设备或隐私模式可能使草稿丢失。重要文档请下载
            MD；多人共用设备时建议关闭本地草稿。
          </p>
          <button className="primary full" onClick={() => setModal("")}>
            知道了
          </button>
        </Modal>
      )}
      {modal === "guide" && (
        <Modal title="让 Markdown 成为作品" onClose={() => setModal("")} wide>
          <div className="guide">
            <p className="guide-lead">
              写作 → 选排版 → 做检查 → 看校样 → 导出。
              <br />
              第一次打开就能开始，不需要账号和配置。
            </p>
            <div className="guide-grid">
              <section>
                <h3>01 / 写什么都可以</h3>
                <p>
                  直接编辑左侧源码，或导入 UTF-8 的 .md /
                  .txt。支持标题、列表、引用、链接、代码高亮、删除线、表格和任务清单原文。
                </p>
                <pre>
                  {
                    "# 标题\n\n**重点** 和 `代码`\n\n> 一段引用\n\n::: pagebreak"
                  }
                </pre>
                <p>
                  <code>::: pagebreak</code> 单独放一行，表示 PDF 强制另起一页。
                </p>
              </section>
              <section>
                <h3>02 / 给内容合适的表达</h3>
                <p>
                  三个排版主题可以随时切换，不改动原文。正文密度、纸张、文首目录和页脚也可以按交付场景调整。
                </p>
                <p>
                  「目录」能定位源码；「检查」会提示失效文内链接、标题层级、缺失图片说明和宽表格。
                </p>
                <h3>03 / 交付前看真实校样</h3>
                <p>
                  阅读预览是连续排版。PDF 校样是真正生成的
                  PDF，适合检查分页。中文字体来自本站，不向第三方发送内容。
                </p>
              </section>
            </div>
            <div className="guide-boundaries">
              <h3>导出与当前边界</h3>
              <p>
                <strong>PDF</strong>
                ：支持中文、链接、列表、表格、代码及独立段落中的嵌入图片。行内图片以文字描述保留；字体不支持的字符（如部分
                Emoji）可能无法显示。斜体使用正文字体，建议在校样中确认。
              </p>
              <p>
                <strong>HTML</strong>：独立网页，携带样式和嵌入图片；
                <strong>MD</strong>
                ：保存完整原文。外部与相对路径图片不自动加载，用「插图」选择本地
                PNG/JPEG，可完整嵌入导出。
              </p>
              <p>
                首版不执行原始 HTML、脚本、Mermaid、数学公式或自定义 CSS。单文档
                4 MiB / 12,000 行，单图 2 MiB / 1600
                万像素。极长代码和宽表格请先校样。草稿保存失败会明确提示，可按
                ⌘/Ctrl + S 下载原文。
              </p>
            </div>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={15} />
          {toast}
          <button aria-label="关闭提示" onClick={() => setToast("")}>
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );
}
