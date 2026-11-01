import { ArrowUpRight, ArrowUpFromLine, BookOpen, Columns2, FileText, Maximize2, ShieldCheck } from "lucide-react";
export function Home({ onStart, onImport, onTemplates, onGuide, restored }: {
  onStart: () => void; onImport: () => void; onTemplates: () => void; onGuide: () => void; restored: boolean;
}) {
  return <div className="home-content">
    <section className="home-hero">
      <div className="eyebrow">A LITTLE ROOM FOR GOOD IDEAS</div>
      <h1>写下想法，<br /><em>交付作品。</em></h1>
      <p>从 Markdown 到值得分享的文档。<br />在完整的编辑工作台里写作、排版、校样，一次完成。</p>
      <div className="home-actions">
        <button className="primary" onClick={onStart}><Maximize2 size={17} />{restored ? "继续编辑本地草稿" : "打开编辑工作台"}<ArrowUpRight size={16} /></button>
        <button className="secondary" onClick={onImport}><ArrowUpFromLine size={16} />导入 Markdown</button>
      </div>
      <span className="home-local"><ShieldCheck size={14} />无需登录 · 正文留在浏览器 · 免费开源</span>
    </section>
    <section className="showcase" aria-label="工作台功能展示">
      <div className="showcase-bar"><span><span className="status-dot" /> PAPERLOOM / 工作台预览</span><button onClick={onStart}>进入全屏编辑 <ArrowUpRight size={14} /></button></div>
      <div className="showcase-body">
        <div className="showcase-source"><span>MARKDOWN</span><pre>{'# 给好想法，一份好文档\n\n> 写作的最后一公里。\n\n## 先写内容，再选风格\n\n- [x] 在线编辑与实时预览\n- [x] 三种文档排版\n- [x] PDF · HTML · Markdown\n\n**让内容，被认真阅读。**'}</pre></div>
        <article className="showcase-paper"><span>NOTES, IDEAS & DOCUMENTATION</span><h2>给好想法，<br />一份好文档</h2><blockquote>写作的最后一公里。</blockquote><h3>先写内容，再选风格</h3><p>技术手册、经验文章、方案报告。<br />同一份 Markdown，三种表达。</p><hr /><small>THOUGHTFULLY WRITTEN.</small></article>
      </div>
    </section>
    <section className="home-features" aria-label="你可以在工作台做什么">
      <div><Columns2 size={22} /><h2>为写作留出空间</h2><p>占满窗口的编辑区，分屏、仅编辑、仅预览自由切换；排版面板随时收起。</p><button onClick={onStart}>开始写作 <ArrowUpRight size={14} /></button></div>
      <div><BookOpen size={22} /><h2>从好模板开始</h2><p>技术手册、杂志文章与正式报告。选好起点，再用目录和检查完善内容。</p><button onClick={onTemplates}>挑选模板 <ArrowUpRight size={14} /></button></div>
      <div><FileText size={22} /><h2>校样，再交付</h2><p>生成真实 PDF 检查分页，导出可选择文字的 PDF、独立 HTML 或原始 MD。</p><button onClick={onGuide}>阅读使用指南 <ArrowUpRight size={14} /></button></div>
    </section>
    <div className="home-bottom"><h2>下一份好文档，从这里开始。</h2><button className="primary" onClick={onStart}>进入编辑工作台 <ArrowUpRight size={16} /></button></div>
  </div>;
}
