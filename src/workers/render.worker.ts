import { compile } from "../core/compile";
self.onmessage = (event) => {
  const { id, source } = event.data;
  try {
    self.postMessage({ id, result: compile(source) });
  } catch (e) {
    self.postMessage({
      id,
      error: e instanceof Error ? e.message : "文档解析失败",
    });
  }
};
