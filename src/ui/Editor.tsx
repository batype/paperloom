import { forwardRef, useImperativeHandle, useRef } from "react";
import CodeMirror, {
  type ReactCodeMirrorRef,
  EditorView,
} from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorSelection } from "@codemirror/state";
export interface EditorHandle {
  jump: (line: number) => void;
  insert: (before: string, after?: string) => void;
}
interface Props {
  value: string;
  onChange: (v: string) => void;
  dark: boolean;
}
export const Editor = forwardRef<EditorHandle, Props>(
  ({ value, onChange, dark }, ref) => {
    const cm = useRef<ReactCodeMirrorRef>(null);
    useImperativeHandle(
      ref,
      () => ({
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
          v.dispatch({
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
    return (
      <CodeMirror
        ref={cm}
        value={value}
        onChange={onChange}
        extensions={[
          EditorView.contentAttributes.of({ "aria-label": "Markdown 源码" }),
          markdown(),
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
        ]}
        theme={dark ? "dark" : "light"}
        basicSetup={{
          foldGutter: false,
          highlightActiveLine: true,
          autocompletion: false,
          bracketMatching: true,
        }}
        aria-label="Markdown 源码编辑器"
        height="100%"
      />
    );
  },
);
