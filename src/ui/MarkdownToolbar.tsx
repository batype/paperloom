import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
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
  type LucideIcon,
} from "lucide-react";
import { Modal } from "./Modal";
import { safeLink, type MarkdownAction } from "../core/editing";
import type { EditorHandle } from "./Editor";
import { visibleToolbarCount } from "../core/toolbar-layout";
type InsertDialog = "" | "link" | "code" | "table";
interface Tool {
  id: string;
  label: string;
  icon?: LucideIcon;
  shortcut?: string;
  hint?: string;
  action?: MarkdownAction;
  dialog?: InsertDialog;
}
const TOOLS: Tool[] = [
  { id: "undo", label: "撤销编辑", icon: Undo2, shortcut: "⌘/Ctrl+Z" },
  { id: "redo", label: "重做编辑", icon: Redo2, shortcut: "⌘/Ctrl+Shift+Z" },
  { id: "heading", label: "设置标题级别", shortcut: "⌘/Ctrl+Alt+1–6" },
  {
    id: "bold",
    label: "粗体",
    icon: Bold,
    shortcut: "⌘/Ctrl+B",
    action: { type: "bold" },
  },
  {
    id: "italic",
    label: "斜体",
    icon: Italic,
    shortcut: "⌘/Ctrl+I",
    action: { type: "italic" },
  },
  {
    id: "strike",
    label: "删除线",
    icon: Strikethrough,
    shortcut: "⌘/Ctrl+Shift+X",
    action: { type: "strike" },
  },
  {
    id: "inline-code",
    label: "行内代码",
    icon: Code,
    shortcut: "⌘/Ctrl+E",
    action: { type: "inline-code" },
  },
  { id: "bullet", label: "无序列表", icon: List, action: { type: "bullet" } },
  {
    id: "ordered",
    label: "有序列表",
    icon: ListOrdered,
    action: { type: "ordered" },
  },
  { id: "task", label: "任务列表", icon: ListTodo, action: { type: "task" } },
  { id: "quote", label: "引用块", icon: Quote, action: { type: "quote" } },
  { id: "link", label: "插入链接", icon: Link, dialog: "link" },
  { id: "image", label: "插入本地图片", icon: ImagePlus, hint: "PNG / JPEG" },
  {
    id: "code",
    label: "代码块",
    icon: Code2,
    dialog: "code",
    hint: "可选语言",
  },
  {
    id: "table",
    label: "表格",
    icon: Table2,
    dialog: "table",
    hint: "可设尺寸",
  },
  { id: "rule", label: "分隔线", icon: Minus, action: { type: "rule" } },
  {
    id: "pagebreak",
    label: "PDF 分页",
    icon: Scissors,
    action: { type: "pagebreak" },
  },
  {
    id: "indent",
    label: "增加缩进",
    icon: IndentIncrease,
    action: { type: "indent" },
  },
  {
    id: "outdent",
    label: "减少缩进",
    icon: IndentDecrease,
    action: { type: "outdent" },
  },
  { id: "search", label: "查找 / 替换", icon: Search, shortcut: "⌘/Ctrl+F" },
];
interface Props {
  editor: RefObject<EditorHandle | null>;
  onImage: () => void;
  history: { undo: boolean; redo: boolean };
}
export function MarkdownToolbar({ editor, onImage, history }: Props) {
  const root = useRef<HTMLDivElement>(null),
    [dialog, setDialog] = useState<InsertDialog>(""),
    [label, setLabel] = useState(""),
    [url, setUrl] = useState(""),
    [language, setLanguage] = useState(""),
    [rows, setRows] = useState(3),
    [columns, setColumns] = useState(3),
    [error, setError] = useState("");
  const measureRow = useRef<HTMLDivElement>(null),
    moreMeasure = useRef<HTMLSpanElement>(null),
    more = useRef<HTMLDetailsElement>(null);
  const [visibleCount, setVisibleCount] = useState(0),
    countRef = useRef(0),
    pendingFocus = useRef<string | null>(null);
  useLayoutEffect(() => {
    const bar = root.current,
      row = measureRow.current,
      button = moreMeasure.current;
    if (!bar || !row || !button) return;
    let stopped = false;
    const measure = () => {
      if (stopped || bar.getBoundingClientRect().width === 0) return;
      const style = getComputedStyle(bar),
        gap = parseFloat(style.columnGap) || 0;
      const available =
        bar.clientWidth -
        (parseFloat(style.paddingLeft) || 0) -
        (parseFloat(style.paddingRight) || 0);
      const widths = Array.from(row.children).map(
        (e) => e.getBoundingClientRect().width,
      );
      const next = visibleToolbarCount(
        available,
        widths,
        button.getBoundingClientRect().width,
        gap,
      );
      if (next === countRef.current) return;
      const active = document.activeElement as HTMLElement | null;
      if (active && bar.contains(active))
        pendingFocus.current =
          active.closest<HTMLElement>("[data-tool-id]")?.dataset.toolId ||
          "more";
      countRef.current = next;
      setVisibleCount(next);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    observer.observe(row);
    observer.observe(button);
    window.addEventListener("resize", measure);
    document.fonts.ready.then(measure);
    measure();
    return () => {
      stopped = true;
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  useLayoutEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    pendingFocus.current = null;
    const target =
      root.current?.querySelector<HTMLElement>(
        `.toolbar-visible [data-tool-id="${id}"]`,
      ) ||
      (more.current?.open
        ? more.current.querySelector<HTMLElement>(`[data-tool-id="${id}"]`)
        : null) ||
      more.current?.querySelector<HTMLElement>("summary") ||
      root.current?.querySelector<HTMLElement>(
        ".toolbar-visible button:not(:disabled),.toolbar-visible select:not(:disabled)",
      );
    target?.focus();
  }, [visibleCount]);
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
    let action: MarkdownAction;
    if (dialog === "link") {
      if (!safeLink(url)) {
        setError("请输入有效的 http(s) 链接、mailto、tel、#锚点或相对路径");
        return;
      }
      action = { type: "link", label, url };
    } else if (dialog === "code") action = { type: "codeblock", language };
    else action = { type: "table", rows, columns };
    setDialog("");
    // Apply after the native modal closes so its focus restoration does not steal the editor caret.
    requestAnimationFrame(() => run(action));
  }
  function activate(tool: Tool) {
    closeMenus();
    if (tool.action) run(tool.action);
    else if (tool.dialog) show(tool.dialog);
    else if (tool.id === "image") onImage();
    else if (tool.id === "undo") editor.current?.undo();
    else if (tool.id === "redo") editor.current?.redo();
    else if (tool.id === "search") editor.current?.search();
  }
  function renderTool(tool: Tool, measuring = false, overflow = false) {
    if (tool.id === "heading")
      return (
        <span
          className={overflow ? "overflow-heading" : "tool-slot"}
          key={tool.id}
        >
          {overflow && <span>标题级别</span>}
          <select
            data-tool-id={measuring ? undefined : tool.id}
            aria-label={tool.label}
            title={`标题级别 (${tool.shortcut})`}
            value=""
            tabIndex={measuring ? -1 : undefined}
            disabled={measuring}
            onChange={(e) =>
              run({ type: "heading", level: Number(e.target.value) })
            }
          >
            <option value="" disabled>
              标题
            </option>
            <option value="0">正文</option>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option value={n} key={n}>
                H{n} 标题
              </option>
            ))}
          </select>
        </span>
      );
    const Icon = tool.icon!;
    const disabled =
      measuring ||
      (tool.id === "undo" && !history.undo) ||
      (tool.id === "redo" && !history.redo);
    return (
      <button
        key={tool.id}
        data-tool-id={measuring ? undefined : tool.id}
        className={overflow ? "overflow-tool" : "tool-slot"}
        aria-label={overflow ? undefined : tool.label}
        title={
          tool.label +
          (tool.shortcut
            ? ` (${tool.shortcut})`
            : tool.hint
              ? ` · ${tool.hint}`
              : "")
        }
        disabled={disabled}
        tabIndex={measuring ? -1 : undefined}
        onClick={() => activate(tool)}
      >
        <Icon size={15} />
        {overflow && (
          <>
            {tool.label}
            {(tool.hint || tool.shortcut) && (
              <small>{tool.hint || tool.shortcut}</small>
            )}
          </>
        )}
      </button>
    );
  }
  return (
    <>
      <div
        className="format-bar adaptive-toolbar"
        ref={root}
        aria-label="Markdown 编辑工具"
        onKeyDown={(e) => {
          if (e.key === "Escape" && more.current?.open) {
            closeMenus();
            more.current?.querySelector<HTMLElement>("summary")?.focus();
          }
        }}
      >
        <div className="toolbar-visible">
          {TOOLS.slice(0, visibleCount).map((tool) => renderTool(tool))}
        </div>
        {visibleCount < TOOLS.length && (
          <details className="tools-dropdown tools-more" ref={more}>
            <summary
              role="button"
              aria-label="更多 Markdown 工具"
              title="显示放不下的编辑工具"
            >
              <MoreHorizontal size={17} />
              <span>更多</span>
            </summary>
            <div className="tools-menu">
              <span>其余编辑工具</span>
              {TOOLS.slice(visibleCount).map((tool) =>
                renderTool(tool, false, true),
              )}
            </div>
          </details>
        )}
        <div className="toolbar-measure" aria-hidden="true" inert>
          <div className="toolbar-measure-row" ref={measureRow}>
            {TOOLS.map((tool) => renderTool(tool, true))}
          </div>
          <span className="toolbar-more-size" ref={moreMeasure}>
            <MoreHorizontal size={17} />
            <span>更多</span>
          </span>
        </div>
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
