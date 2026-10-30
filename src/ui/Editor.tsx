import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useMemo,
  useCallback,
} from "react";
import CodeMirror, {
  type ReactCodeMirrorRef,
  EditorView,
} from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorSelection, EditorState, Prec } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import {
  undo,
  redo,
  undoDepth,
  redoDepth,
  isolateHistory,
} from "@codemirror/commands";
import {
  openSearchPanel,
  search,
  SearchQuery,
  getSearchQuery,
  setSearchQuery,
} from "@codemirror/search";
import { markdownEdit, type MarkdownAction } from "../core/editing";
import { checkInput } from "../core/model";
export interface EditorHandle {
  command: (action: MarkdownAction) => void;
  selection: () => string;
  undo: () => void;
  redo: () => void;
  search: () => void;
  jump: (line: number) => void;
  insert: (before: string, after?: string) => void;
}
const BASIC_SETUP = {
  foldGutter: false,
  highlightActiveLine: true,
  autocompletion: false,
  bracketMatching: true,
};
interface Props {
  value: string;
  onChange: (v: string) => void;
  dark: boolean;
  onError: (message: string) => void;
  onHistory: (history: { undo: boolean; redo: boolean }) => void;
}
export const Editor = forwardRef<EditorHandle, Props>(
  ({ value, onChange, dark, onError, onHistory }, ref) => {
    const cm = useRef<ReactCodeMirrorRef>(null);
    const errorHandler = useRef(onError);
    errorHandler.current = onError;
    const command = useCallback((action: MarkdownAction) => {
      const v = cm.current?.view;
      if (!v) return;
      try {
        const { from, to } = v.state.selection.main;
        const change = markdownEdit(v.state.doc.toString(), from, to, action);
        checkInput(
          v.state.doc.sliceString(0, change.from) +
            change.insert +
            v.state.doc.sliceString(change.to),
        );
        v.dispatch({
          changes: { from: change.from, to: change.to, insert: change.insert },
          selection: { anchor: change.anchor, head: change.head },
          annotations: isolateHistory.of("full"),
          scrollIntoView: true,
        });
        v.focus();
      } catch (e) {
        errorHandler.current((e as Error).message);
      }
    }, []);
    const handlers = useRef({ onChange, onHistory });
    handlers.current = { onChange, onHistory };
    const handleChange = useCallback(
      (value: string) => handlers.current.onChange(value),
      [],
    );
    const handleUpdate = useCallback(
      (u: import("@codemirror/view").ViewUpdate) => {
        if (u.docChanged)
          handlers.current.onHistory({
            undo: undoDepth(u.state) > 0,
            redo: redoDepth(u.state) > 0,
          });
      },
      [],
    );
    const shortcuts = [
      { key: "Mod-b", action: { type: "bold" } },
      { key: "Mod-i", action: { type: "italic" } },
      { key: "Mod-Shift-x", action: { type: "strike" } },
      { key: "Mod-e", action: { type: "inline-code" } },
      { key: "Mod-Shift-8", action: { type: "bullet" } },
      { key: "Mod-Shift-7", action: { type: "ordered" } },
      { key: "Mod-Shift-9", action: { type: "task" } },
      { key: "Mod-Shift-b", action: { type: "quote" } },
      ...[1, 2, 3, 4, 5, 6].map((level) => ({
        key: `Mod-Alt-${level}`,
        action: { type: "heading", level },
      })),
    ] as { key: string; action: MarkdownAction }[];
    useImperativeHandle(
      ref,
      () => ({
        command,
        selection() {
          const v = cm.current?.view;
          return v
            ? v.state.sliceDoc(
                v.state.selection.main.from,
                v.state.selection.main.to,
              )
            : "";
        },
        undo() {
          const v = cm.current?.view;
          if (v) {
            undo(v);
            v.focus();
          }
        },
        redo() {
          const v = cm.current?.view;
          if (v) {
            redo(v);
            v.focus();
          }
        },
        search() {
          const v = cm.current?.view;
          if (v) openSearchPanel(v);
        },
        jump(line) {
          const v = cm.current?.view;
          if (!v) return;
          const target = v.state.doc.line(
            Math.max(1, Math.min(v.state.doc.lines, line)),
          );
          v.dispatch({
            selection: { anchor: target.from },
            effects: EditorView.scrollIntoView(target.from, { y: "center" }),
          });
          v.focus();
        },
        insert(before, after = "") {
          const v = cm.current?.view;
          if (!v) return;
          const { from, to } = v.state.selection.main,
            selected = v.state.sliceDoc(from, to);
          try {
            checkInput(
              v.state.doc.sliceString(0, from) +
                before +
                selected +
                after +
                v.state.doc.sliceString(to),
            );
          } catch (e) {
            errorHandler.current((e as Error).message);
            return;
          }
          v.dispatch({
            annotations: isolateHistory.of("full"),
            changes: { from, to, insert: before + selected + after },
            selection: EditorSelection.cursor(
              from + before.length + selected.length,
            ),
          });
          v.focus();
        },
      }),
      [],
    );
    const extensions = useMemo(
      () => [
        EditorView.contentAttributes.of({ "aria-label": "Markdown 源码" }),
        markdown(),
        search(),
        Prec.highest(
          keymap.of(
            shortcuts.map((s) => ({
              key: s.key,
              run: () => {
                command(s.action);
                return true;
              },
            })),
          ),
        ),
        EditorState.phrases.of({
          Find: "查找",
          Replace: "替换",
          next: "下一个",
          previous: "上一个",
          all: "全选匹配",
          "match case": "区分大小写",
          "by word": "全词匹配",
          regexp: "正则表达式",
          replace: "替换",
          "replace all": "全部替换",
          close: "关闭",
          Search: "搜索",
          "No matches": "没有匹配项",
        }),
        EditorView.lineWrapping,
        EditorView.theme({
          "&": { fontSize: "13px", height: "100%" },
          ".cm-content": {
            fontFamily: '"SFMono-Regular",Consolas,monospace',
            padding: "22px 0",
            lineHeight: "1.9",
          },
          ".cm-scroller": { overflow: "auto" },
          ".cm-gutters": {
            backgroundColor: "transparent",
            border: "none",
            color: dark ? "#697384" : "#a6acb8",
            fontSize: "10px",
          },
          ".cm-activeLineGutter": { backgroundColor: "transparent" },
          ".cm-line": { padding: "0 22px 0 12px" },
          ".cm-activeLine": {
            backgroundColor: dark ? "#ffffff05" : "#4263eb05",
          },
        }),
      ],
      [dark, command],
    );
    return (
      <CodeMirror
        ref={cm}
        value={value}
        onInputCapture={(event) => {
          const target = event.target as HTMLElement,
            panel = target.closest(".cm-search"),
            v = cm.current?.view;
          if (!panel || !v) return;
          const input = (name: string) =>
            panel.querySelector<HTMLInputElement>(`input[name="${name}"]`);
          const query = new SearchQuery({
            search: input("search")?.value || "",
            replace: input("replace")?.value || "",
            caseSensitive: input("case")?.checked || false,
            regexp: input("re")?.checked || false,
            wholeWord: input("word")?.checked || false,
          });
          if (!getSearchQuery(v.state).eq(query))
            v.dispatch({ effects: setSearchQuery.of(query) });
        }}
        onChange={handleChange}
        onUpdate={handleUpdate}
        extensions={extensions}
        theme={dark ? "dark" : "light"}
        basicSetup={BASIC_SETUP}
        aria-label="Markdown 源码编辑器"
        height="100%"
      />
    );
  },
);
