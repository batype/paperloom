import { exportHtml } from "../core/html";
self.onmessage = (e) => {
  try {
    self.postMessage({ html: exportHtml(e.data.source, e.data.options) });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "HTML 导出失败",
    });
  }
};
