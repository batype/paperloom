import { useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { templates, templateCategories, type TemplateCategory, type DocumentTemplate } from "../core/templates";
import { useCompiler } from "./useCompiler";
import { documentCss } from "../core/styles";
import { DEFAULT_OPTIONS } from "../core/model";
import { Modal } from "./Modal";

export function TemplatesModal({ onClose, onSelect }: {
  onClose: () => void;
  onSelect: (template: DocumentTemplate, createNew: boolean) => void;
}) {
  const [selected,setSelected] = useState<DocumentTemplate|null>(null);
  const [category, setCategory] = useState<TemplateCategory>("全部");
  const [query, setQuery] = useState("");
  const matches = templates.filter((t) =>
    (category === "全部" || t.category === category) &&
    `${t.label} ${t.description} ${t.category}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  if (selected) return <TemplatePreview template={selected} onBack={()=>setSelected(null)} onClose={onClose} onSelect={onSelect} />;
  return <Modal title="从一份好模板开始" onClose={onClose} wide>
    <p className="modal-description">先预览完整模板，再创建新文档。也可选择替换当前文档，替换前会保留历史版本。</p>
    <div className="template-filters">
      <label className="template-search"><Search size={15} /><input aria-label="搜索模板" placeholder="搜索模板，如工作汇报、技术分享" value={query} onChange={(e) => setQuery(e.target.value)} type="search" /></label>
      <div className="template-categories" role="group" aria-label="模板分类">
        {templateCategories.map((c) => <button key={c} aria-pressed={c === category} onClick={() => setCategory(c)}>{c}<span>{c === "全部" ? templates.length : templates.filter((t) => t.category === c).length}</span></button>)}
      </div>
      <p className="template-count" role="status">找到 {matches.length} 份模板 · 可套用任意排版风格</p>
    </div>
    <div className="template-grid template-library">
      {matches.map((t) => <button key={t.id} className={`template-card template-${t.theme}`} aria-label={`预览${t.label}模板`} onClick={() => setSelected(t)}>
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

function TemplatePreview({template,onBack,onClose,onSelect}:{template:DocumentTemplate;onBack:()=>void;onClose:()=>void;onSelect:(t:DocumentTemplate,createNew:boolean)=>void}) {
  const {result,error,busy,retry}=useCompiler(template.source);
  return <Modal title={`${template.label} · 完整预览`} onClose={onClose} wide>
    <div className="template-full-preview"><button className="secondary" onClick={onBack}>返回模板列表</button>
      <p>{template.description} · 使用后可自由修改正文与排版。</p>
      <style>{documentCss({...DEFAULT_OPTIONS,theme:template.theme})}</style>
      {error ? <div role="alert">{error}<button onClick={retry}>重新预览</button></div> : busy ? <p role="status">正在生成预览…</p> : <article className="paper" dangerouslySetInnerHTML={{__html:result?.html||''}} />}
    </div>
    <div className="modal-actions template-use-actions"><button className="secondary" onClick={()=>onSelect(template,false)}>替换当前文档</button><button className="primary" onClick={()=>onSelect(template,true)}>用此模板新建文档</button></div>
  </Modal>;
}
