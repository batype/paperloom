import { useEffect, useRef, useState } from "react";
import type { Compilation } from "../core/model";
export function useCompiler(source: string) {
  const worker = useRef<Worker | null>(null),
    seq = useRef(0);
  const [result, setResult] = useState<Compilation | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [compiledSource, setCompiledSource] = useState("");
  useEffect(() => {
    setBusy(true);
    setError("");
    const id = ++seq.current;
    let timeout: ReturnType<typeof setTimeout>;
    const timer = setTimeout(() => {
      worker.current?.terminate();
      const w = new Worker(
        new URL("../workers/render.worker.ts", import.meta.url),
        { type: "module" },
      );
      worker.current = w;
      timeout = setTimeout(() => {
        w.terminate();
        if (id === seq.current) {
          setBusy(false);
          setError("解析超过 6 秒，请精简文档后重试");
        }
      }, 6000);
      w.onmessage = (e) => {
        if (e.data.id !== seq.current) return;
        clearTimeout(timeout);
        setBusy(false);
        if (e.data.error) setError(e.data.error);
        else {
          setResult(e.data.result);
          setCompiledSource(source);
        }
        w.terminate();
      };
      w.onerror = () => {
        if (id !== seq.current) return;
        clearTimeout(timeout);
        setBusy(false);
        setError("预览加载失败，请刷新页面重试");
        w.terminate();
      };
      w.postMessage({ id, source });
    }, 180);
    return () => {
      clearTimeout(timer);
      clearTimeout(timeout);
      worker.current?.terminate();
    };
  }, [source]);
  return {
    result,
    error,
    busy,
    fresh: compiledSource === source && !error && !busy,
  };
}
