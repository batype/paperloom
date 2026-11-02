import test from 'node:test';
import assert from 'node:assert/strict';
import {saveDocument,readDocument,listDocuments,clearDocuments,DOCUMENT_PREFIX} from '../lib/documents.js';
import {DEFAULT_OPTIONS} from '../lib/model.js';
function storage(){const data=new Map();return {get length(){return data.size},key:i=>[...data.keys()][i]??null,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}
const draft=(source)=>({source,name:'文档',options:DEFAULT_OPTIONS});
test('independent documents survive updates and can be reopened with settings',()=>{
 const s=storage();let a=saveDocument(s,'a',null,draft('甲'));saveDocument(s,'b',null,draft('乙'));
 a=saveDocument(s,'a',a.revision,{...draft('更新'),options:{...DEFAULT_OPTIONS,theme:'report'}});
 assert.equal(readDocument(s,'b').source,'乙');assert.equal(readDocument(s,'a').options.theme,'report');assert.equal(listDocuments(s).documents.length,2);
});
test('forced replacement and restoring keep previous text and settings recoverable',()=>{
 const s=storage();let a=saveDocument(s,'a',null,draft('原文'),false,0);
 a=saveDocument(s,'a',a.revision,draft('模板'),true,1000);
 assert.equal(a.history[0].source,'原文');
 a=saveDocument(s,'a',a.revision,a.history[0],true,2000);
 assert.equal(a.source,'原文');assert.equal(a.history[0].source,'模板');
});
test('automatic versions are throttled, retain 20 snapshots, no-op saves do not grow history',()=>{
 const s=storage();let a=saveDocument(s,'a',null,draft('0'),false,0);
 for(let i=1;i<=25;i++)a=saveDocument(s,'a',a.revision,draft(String(i)),false,i*61000);
 assert.equal(a.history.length,20);const revision=a.revision;
 a=saveDocument(s,'a',a.revision,draft('25'),true,2000000);assert.equal(a.revision,revision);
 const n=a.history.length;a=saveDocument(s,'a',a.revision,draft('26'),false,a.updatedAt+1);assert.equal(a.history.length,n);
});
test('quota failure and stale-tab save preserve existing data',()=>{
 const s=storage();const a=saveDocument(s,'a',null,draft('原文'));
 const b=saveDocument(s,'a',a.revision,draft('其他标签'),true);
 assert.throws(()=>saveDocument(s,'a',a.revision,draft('陈旧内容')),/其他标签/);
 const raw=s.getItem(DOCUMENT_PREFIX+'a');s.setItem=()=>{throw new Error('QuotaExceededError')};
 assert.throws(()=>saveDocument(s,'a',b.revision,draft('未保存')));assert.equal(s.getItem(DOCUMENT_PREFIX+'a'),raw);
});
test('malformed documents remain untouched, clearing removes only Paperloom drafts',()=>{
 const s=storage();s.setItem(DOCUMENT_PREFIX+'broken','invalid');s.setItem('other','keep');
 assert.equal(listDocuments(s).errors.length,1);assert.throws(()=>saveDocument(s,'broken',null,draft('')));assert.equal(s.getItem(DOCUMENT_PREFIX+'broken'),'invalid');
 s.setItem('paperloom.draft.v1','legacy');clearDocuments(s);assert.equal(s.getItem('other'),'keep');assert.equal(s.getItem('paperloom.draft.v1'),null);
});
