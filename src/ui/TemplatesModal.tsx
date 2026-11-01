import { useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { templates, templateCategories, type TemplateCategory, type DocumentTemplate } from "../core/templates";
import { Modal } from "./Modal";

export function TemplatesModal({ onClose, onSelect }: {
  onClose: () => void;
  onSelect: (template: DocumentTemplate) => void;
}) {
  const [category, setCategory] = useState<TemplateCategory>("全部");
  const [query, setQuery] = useState("");
  const matches = templates.filter((t) =>
    (category === "全部" || t.category === category) &&
    `${t.label} ${t.description} ${t.category}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  return <Modal title="从一份好模板开始" onClose={onClose} wide>
    <p className="modal-description">选择适合场景的内容骨架，载入后自由修改。模板会替换当前内容，可在工作台「撤销替换」。</p>
    <div className="template-filters">
      <label className="template-search"><Search size={15} /><input aria-label="搜索模板" placeholder="搜索模板，如工作汇报、技术分享" value={query} onChange={(e) => setQuery(e.target.value)} type="search" /></label>
      <div className="template-categories" role="group" aria-label="模板分类">
        {templateCategories.map((c) => <button key={c} aria-pressed={c === category} onClick={() => setCategory(c)}>{c}<span>{c === "全部" ? templates.length : templates.filter((t) => t.category === c).length}</span></button>)}
      </div>
      <p className="template-count" role="status">找到 {matches.length} 份模板 · 可套用任意排版风格</p>
    </div>
    <div className="template-grid template-library">
      {matches.map((t) => <button key={t.id} className={`template-card template-${t.theme}`} aria-label={`使用${t.label}模板`} onClick={() => onSelect(t)}>
        <div className="template-preview">
          <span>{t.category} / {t.theme === "manual" ? "技术手册" : t.theme === "report" ? "正式报告" : "杂志文章"}</span>
          <h3>{t.label}</h3>
          <ul>{t.source.split("\n").filter((line) => line.startsWith("## ")).slice(0, 3).map((line) => <li key={line}>{line.slice(3)}</li>)}</ul>
        </div>
        <strong>{t.label}<ArrowUpRight size={15} /></strong>
        <p>{t.description}</p>
      </button>)}
    </div>
    {matches.length === 0 && <div className="template-empty"><p>没有找到匹配的模板</p><button className="secondary" onClick={() => { setQuery(""); setCategory("全部"); }}>查看全部模板</button></div>}
  </Modal>;
}
