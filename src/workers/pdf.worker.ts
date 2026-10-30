import pdfMake from "pdfmake/build/pdfmake";
import { buildPdf } from "../core/pdf";
let fontsReady: Promise<void> | null = null;
function b64(buffer: ArrayBuffer) {
  const a = new Uint8Array(buffer);
  let text = "";
  for (let i = 0; i < a.length; i += 0x8000)
    text += String.fromCharCode(...a.subarray(i, i + 0x8000));
  return btoa(text);
}
function setup(base: string) {
  return (fontsReady ||= (async () => {
    const files = ["Regular", "Bold"];
    const vfs: Record<string, string> = {};
    for (let i = 0; i < files.length; i++) {
      self.postMessage({
        progress: `加载中文字体 ${i + 1} / ${files.length}…`,
      });
      const r = await fetch(`${base}fonts/NotoSansSC-${files[i]}.ttf`);
      if (!r.ok) throw new Error("中文字体加载失败，请重试");
      vfs[`NotoSansSC-${files[i]}.ttf`] = b64(await r.arrayBuffer());
    }
    pdfMake.vfs = vfs;
    pdfMake.fonts = {
      NotoSC: {
        normal: "NotoSansSC-Regular.ttf",
        bold: "NotoSansSC-Bold.ttf",
        italics: "NotoSansSC-Regular.ttf",
        bolditalics: "NotoSansSC-Bold.ttf",
      },
    };
  })());
}
self.onmessage = async (event) => {
  try {
    const { source, options, base } = event.data;
    await setup(base);
    self.postMessage({ progress: "正在分页与排版…" });
    const definition = buildPdf(source, options);
    const buffer = await new Promise<Uint8Array>((resolve, reject) => {
      try {
        pdfMake.createPdf(definition).getBuffer(resolve);
      } catch (e) {
        reject(e);
      }
    });
    self.postMessage({ buffer }, { transfer: [buffer.buffer as ArrayBuffer] });
  } catch (e) {
    self.postMessage({
      error:
        e instanceof Error
          ? e.message
          : "PDF 生成失败，请检查文档或尝试减少内容",
    });
  }
};
