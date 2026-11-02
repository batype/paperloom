import { useState } from 'react';
import { Modal } from './Modal';
import { listDocuments, type SavedDocument, type Snapshot } from '../core/documents';
export function DocumentsModal({onClose,onOpen,onRestore,currentId,enabled}: {
  onClose:()=>void; onOpen:(doc:SavedDocument)=>void; onRestore:(snapshot:Snapshot)=>void; currentId:string; enabled:boolean;
}) {
  const [listing] = useState(() => { try { return listDocuments(localStorage); } catch { return {documents:[],errors:['浏览器存储不可用，请下载 MD 保存。']}; } });
  const [selected,setSelected] = useState<SavedDocument|null>(null);
  const [snapshot,setSnapshot] = useState<Snapshot|null>(null);
  return <Modal title="最近文档与历史版本" onClose={onClose} wide>
    <div className="document-library">
      <p>保存于此浏览器。历史版本自动按约一分钟间隔保留，替换和恢复前额外备份，最多保留 20 个版本。</p>
      {!enabled && <p role="status">本地保存已关闭。当前正文仍可编辑和下载；开启后才会保留最近文档与历史。</p>}
      {listing.errors.map((e,i)=><p role="alert" key={i}>{e}</p>)}
      {!selected ? <>
        {!listing.documents.length && <p>还没有保存的文档。</p>}
        {listing.documents.map(d=><div className="saved-document" key={d.id}><div><strong>{d.name || '未命名文档'} {d.id===currentId && '· 当前'}</strong><small>{new Date(d.updatedAt).toLocaleString()} · {d.source.length.toLocaleString()} 字符</small></div><button className="secondary" onClick={()=>onOpen(d)}>打开</button><button className="secondary" onClick={()=>setSelected(d)}>历史 ({d.history.length})</button></div>)}
      </> : <>
        <button className="secondary" onClick={()=>{setSelected(null);setSnapshot(null);}}>返回文档列表</button><h3>{selected.name} · 历史版本</h3>
        {selected.id!==currentId && <p>请先打开这份文档，再恢复其历史版本。</p>}
        {!selected.history.length && <p>尚无历史版本；继续编辑后会自动保留。</p>}
        {selected.history.map(h=><button className="history-version" key={h.id} onClick={()=>setSnapshot(h)} aria-pressed={snapshot?.id===h.id}>{new Date(h.at).toLocaleString()} · {h.name} · {h.source.length.toLocaleString()} 字符</button>)}
        {snapshot && <><pre className="history-source">{snapshot.source}</pre><button className="primary" disabled={selected.id!==currentId} onClick={()=>onRestore(snapshot)}>恢复此版本（保留当前版本）</button></>}
      </>}
    </div>
  </Modal>;
}
