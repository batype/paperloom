import { useEffect, useRef, useState, type RefObject } from "react";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Code2,
  Link,
  ImagePlus,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  MoreHorizontal,
  Minus,
  Table2,
  Scissors,
  IndentIncrease,
  IndentDecrease,
  Undo2,
  Redo2,
  Search,
  ChevronDown,
} from "lucide-react";
import { Modal } from "./Modal";
import { safeLink, type MarkdownAction } from "../core/editing";
import type { EditorHandle } from "./Editor";
interface Props {
  editor: RefObject<EditorHandle | null>;
  onImage: () => void;
  history: { undo: boolean; redo: boolean };
}
export function MarkdownToolbar({ editor, onImage, history }: Props) {
  const root = useRef<HTMLDivElement>(null),
    [dialog, setDialog] = useState<"" | "link" | "code" | "table">(""),
    [label, setLabel] = useState(""),
    [url, setUrl] = useState(""),
    [language, setLanguage] = useState(""),
    [rows, setRows] = useState(3),
    [columns, setColumns] = useState(3),
    [error, setError] = useState("");
  function closeMenus() {
    root.current
      ?.querySelectorAll("details[open]")
      .forEach((d) => d.removeAttribute("open"));
  }
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) closeMenus();
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  function run(action: MarkdownAction) {
    closeMenus();
    editor.current?.command(action);
  }
  function show(kind: typeof dialog) {
    closeMenus();
    setError("");
    if (kind === "link") {
      const selected = editor.current?.selection() || "";
      const isUrl = /^https?:\/\//.test(selected);
      setLabel(isUrl ? "" : selected);
      setUrl(isUrl ? selected : "");
    }
    setDialog(kind);
  }
  function submit() {
    if (dialog === "link") {
      if (!safeLink(url)) {
        setError("请输入有效的 http(s) 链接、mailto、tel、#锚点或相对路径");
        return;
      }
      run({ type: "link", label, url });
    } else if (dialog === "code") run({ type: "codeblock", language });
    else run({ type: "table", rows, columns });
    setDialog("");
  }
  return (
    <>
      <div
        className="format-bar"
        ref={root}
        aria-label="Markdown 编辑工具"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            const d = root.current?.querySelector("details[open]");
            closeMenus();
            (d?.querySelector("summary") as HTMLElement)?.focus();
          }
        }}
      >
        <div className="format-group" aria-label="编辑历史">
          <button
            title="撤销 (⌘/Ctrl+Z)"
            aria-label="撤销编辑"
            disabled={!history.undo}
            onClick={() => editor.current?.undo()}
          >
            <Undo2 size={15} />
          </button>
          <button
            title="重做 (⌘/Ctrl+Shift+Z)"
            aria-label="重做编辑"
            disabled={!history.redo}
            onClick={() => editor.current?.redo()}
          >
            <Redo2 size={15} />
          </button>
        </div>
        <span className="tool-divider" />
        <select
          aria-label="设置标题级别"
          title="标题级别 (⌘/Ctrl+Alt+1–6)"
          value=""
          onChange={(e) =>
            run({ type: "heading", level: Number(e.target.value) })
          }
        >
          <option value="" disabled>
            标题
          </option>
          <option value="0">正文</option>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              H{n} 标题
            </option>
          ))}
        </select>
        <div className="format-group" aria-label="文字格式">
          <button
            title="粗体 (⌘/Ctrl+B)"
            aria-label="粗体"
            onClick={() => run({ type: "bold" })}
          >
            <Bold size={15} />
          </button>
          <button
            title="斜体 (⌘/Ctrl+I)"
            aria-label="斜体"
            onClick={() => run({ type: "italic" })}
          >
            <Italic size={15} />
          </button>
          <button
            title="删除线 (⌘/Ctrl+Shift+X)"
            aria-label="删除线"
            onClick={() => run({ type: "strike" })}
          >
            <Strikethrough size={15} />
          </button>
          <button
            title="行内代码 (⌘/Ctrl+E)"
            aria-label="行内代码"
            onClick={() => run({ type: "inline-code" })}
          >
            <Code size={15} />
          </button>
        </div>
        <details className="tools-dropdown" name="markdown-tools">
          <summary role="button" aria-label="列表与引用" title="列表与引用">
            <List size={15} />
            <span>列表</span>
            <ChevronDown size={10} />
          </summary>
          <div className="tools-menu">
            <span>列表与引用</span>
            <button onClick={() => run({ type: "bullet" })}>
              <List size={15} />
              无序列表<small>⇧⌘8</small>
            </button>
            <button onClick={() => run({ type: "ordered" })}>
              <ListOrdered size={15} />
              有序列表<small>⇧⌘7</small>
            </button>
            <button onClick={() => run({ type: "task" })}>
              <ListTodo size={15} />
              任务列表<small>⇧⌘9</small>
            </button>
            <button onClick={() => run({ type: "quote" })}>
              <Quote size={15} />
              引用块<small>⇧⌘B</small>
            </button>
            <hr />
            <button onClick={() => run({ type: "indent" })}>
              <IndentIncrease size={15} />
              增加缩进
            </button>
            <button onClick={() => run({ type: "outdent" })}>
              <IndentDecrease size={15} />
              减少缩进
            </button>
          </div>
        </details>
        <button
          title="插入链接"
          aria-label="插入链接"
          onClick={() => show("link")}
        >
          <Link size={15} />
        </button>
        <button
          title="嵌入本地 PNG / JPEG"
          aria-label="插入本地图片"
          onClick={onImage}
        >
          <ImagePlus size={15} />
        </button>
        <details className="tools-dropdown tools-more" name="markdown-tools">
          <summary
            role="button"
            aria-label="更多 Markdown 工具"
            title="更多插入与编辑工具"
          >
            <MoreHorizontal size={17} />
            <span>更多</span>
          </summary>
          <div className="tools-menu">
            <span>插入</span>
            <button onClick={() => show("code")}>
              <Code2 size={15} />
              代码块<small>可选语言</small>
            </button>
            <button onClick={() => show("table")}>
              <Table2 size={15} />
              表格<small>可设尺寸</small>
            </button>
            <button onClick={() => run({ type: "rule" })}>
              <Minus size={15} />
              分隔线
            </button>
            <button onClick={() => run({ type: "pagebreak" })}>
              <Scissors size={15} />
              PDF 分页
            </button>
            <hr />
            <button
              onClick={() => {
                closeMenus();
                editor.current?.search();
              }}
            >
              <Search size={15} />
              查找 / 替换<small>⌘/Ctrl+F</small>
            </button>
          </div>
        </details>
      </div>
      {dialog && (
        <Modal
          title={
            dialog === "link"
              ? "插入链接"
              : dialog === "code"
                ? "插入代码块"
                : "插入表格"
          }
          onClose={() => setDialog("")}
        >
          <form
            className="insert-form"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            {dialog === "link" ? (
              <>
                <label>
                  链接文字
                  <input
                    autoFocus
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="选中的文字会自动带入"
                    maxLength={2000}
                  />
                </label>
                <label>
                  链接地址
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com 或 #章节标题"
                    required
                    maxLength={4000}
                  />
                </label>
                <p>支持网页链接、邮箱、电话、文内锚点和相对路径。</p>
              </>
            ) : dialog === "code" ? (
              <>
                <label>
                  代码语言
                  <select
                    autoFocus
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    {[
                      ["", "纯文本"],
                      ["typescript", "TypeScript"],
                      ["javascript", "JavaScript"],
                      ["json", "JSON"],
                      ["bash", "Shell / Bash"],
                      ["python", "Python"],
                      ["java", "Java"],
                      ["go", "Go"],
                      ["sql", "SQL"],
                      ["html", "HTML"],
                      ["css", "CSS"],
                      ["yaml", "YAML"],
                      ["markdown", "Markdown"],
                    ].map(([id, name]) => (
                      <option value={id} key={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <p>
                  选中的内容会放入代码块。再次对完整代码块应用，可还原为普通文本。
                </p>
              </>
            ) : (
              <>
                <div className="insert-grid">
                  <label>
                    列数
                    <input
                      autoFocus
                      type="number"
                      min={1}
                      max={6}
                      required
                      value={columns}
                      onChange={(e) => setColumns(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    数据行数
                    <input
                      type="number"
                      min={1}
                      max={20}
                      required
                      value={rows}
                      onChange={(e) => setRows(Number(e.target.value))}
                    />
                  </label>
                </div>
                <p>另外包含一行表头。选中的文字会保留在表格下方。</p>
              </>
            )}
            {error && (
              <p className="insert-error" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setDialog("")}
              >
                取消
              </button>
              <button type="submit" className="primary">
                插入
                {dialog === "link"
                  ? "链接"
                  : dialog === "code"
                    ? "代码块"
                    : "表格"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
