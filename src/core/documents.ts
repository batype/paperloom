import { checkInput, validateOptions, type Options } from './model.js';
export const DOCUMENT_PREFIX = 'paperloom.document.v1.';
export const ACTIVE_DOCUMENT = 'paperloom.active.v1';
export interface Draft { source: string; name: string; options: Options }
export interface Snapshot extends Draft { at: number; id: string }
export interface SavedDocument extends Draft { id: string; revision: string; updatedAt: number; history: Snapshot[] }
export type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;
function validateDraft(value: Draft): Draft {
  if (!value || typeof value.source !== 'string' || typeof value.name !== 'string') throw new Error('文档数据格式不正确');
  checkInput(value.source);
  return { source: value.source, name: value.name.slice(0,80), options: validateOptions(value.options) };
}
export function readDocument(store: Store, id: string): SavedDocument | null {
  const raw = store.getItem(DOCUMENT_PREFIX + id);
  if (!raw) return null;
  const d = JSON.parse(raw);
  if (d.id !== id || typeof d.revision !== 'string' || !Number.isFinite(d.updatedAt) || !Array.isArray(d.history)) throw new Error('已保存文档损坏，未覆盖原数据');
  return { ...validateDraft(d), id, revision: d.revision, updatedAt: d.updatedAt, history: d.history.map((h: Snapshot) => {
    if (typeof h.id !== 'string' || !Number.isFinite(h.at)) throw new Error('历史版本格式不正确');
    return { ...validateDraft(h), at: h.at, id: h.id };
  }) };
}
export function listDocuments(store: Store) {
  const documents: SavedDocument[] = [], errors: string[] = [];
  for (let n = 0; n < store.length; n++) {
    const key = store.key(n);
    if (!key?.startsWith(DOCUMENT_PREFIX)) continue;
    try { const d = readDocument(store, key.slice(DOCUMENT_PREFIX.length)); if (d) documents.push(d); }
    catch { errors.push('有文档无法读取，原始数据已保留。'); }
  }
  return { documents: documents.sort((a,b) => b.updatedAt - a.updatedAt), errors };
}
export function saveDocument(store: Store, id: string, expectedRevision: string | null, draft: Draft, force = false, now = Date.now()): SavedDocument {
  const data = validateDraft(draft), old = readDocument(store,id);
  if ((old?.revision ?? null) !== expectedRevision) throw new Error('此文档已在其他标签页更新。请先另存副本，再从最近文档打开最新版本。');
  if (old && JSON.stringify(data) === JSON.stringify({source:old.source,name:old.name,options:old.options})) return old;
  const history = old ? [...old.history] : [];
  if (old && (force || !history.length || now - history[0].at >= 60000)) {
    history.unshift({source:old.source,name:old.name,options:old.options,at:old.updatedAt,id:old.revision});
  }
  const saved = {...data,id,revision:crypto.randomUUID(),updatedAt:now,history:history.slice(0,20)};
  // One atomic write: quota failures retain the previous document and its history.
  store.setItem(DOCUMENT_PREFIX + id, JSON.stringify(saved));
  return saved;
}
export function clearDocuments(store: Store) {
  const keys: string[] = [];
  for(let i=0;i<store.length;i++) { const key=store.key(i); if(key?.startsWith(DOCUMENT_PREFIX)) keys.push(key); }
  for(const key of keys) store.removeItem(key);
  store.removeItem(ACTIVE_DOCUMENT);
  store.removeItem('paperloom.draft.v1');
}
