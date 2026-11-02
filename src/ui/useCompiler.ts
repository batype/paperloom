import { useEffect, useRef, useState } from 'react';
import type { Compilation } from '../core/model';
export function useCompiler(source:string) {
  const [result,setResult]=useState<Compilation|null>(null), [error,setError]=useState(''),
    [busy,setBusy]=useState(true), [compiledSource,setCompiledSource]=useState<string|null>(null), [attempt,setAttempt]=useState(0);
  const worker=useRef<Worker|null>(null), ready=useRef(false), running=useRef<{id:number;source:string}|null>(null),
    pending=useRef<{id:number;source:string}|null>(null), sequence=useRef(0), timer=useRef<ReturnType<typeof setTimeout>|null>(null),
    send=useRef(()=>{}), latest=useRef(source);
  latest.current=source;
  useEffect(()=>{
    let disposed=false;
    const clear=()=>{if(timer.current)clearTimeout(timer.current);timer.current=null;};
    const fail=(message:string)=>{if(disposed)return;clear();worker.current?.terminate();worker.current=null;ready.current=false;running.current=null;setBusy(false);setError(message);};
    ready.current=false;running.current=null;pending.current={id:++sequence.current,source:latest.current};
    setBusy(true);setError('');
    let w:Worker;
    try { w=new Worker(new URL('../workers/render.worker.ts',import.meta.url),{type:'module'}); }
    catch { fail('预览引擎无法启动。可以重试，或先下载 MD 保存正文。'); return; }
    worker.current=w;
    send.current=()=>{
      if(disposed || !ready.current || running.current || !pending.current)return;
      const request=pending.current;pending.current=null;running.current=request;
      clear();timer.current=setTimeout(()=>fail('正文解析超过 6 秒。请重试或拆分文档；仍可下载 MD。'),6000);
      w.postMessage(request);
    };
    timer.current=setTimeout(()=>fail('预览引擎加载超时，请检查网络后重新预览。正文仍可下载为 MD。'),15000);
    w.onerror=()=>fail('预览引擎加载或运行失败，请重新预览。正文仍可下载为 MD。');
    w.onmessage=e=>{
      if(disposed)return;
      if(e.data.ready){clear();ready.current=true;send.current();return;}
      if(!running.current || e.data.id!==running.current.id)return;
      const request=running.current;running.current=null;clear();
      if(request.id===sequence.current){
        setBusy(false);
        if(e.data.error)setError(e.data.error);
        else{setResult(e.data.result);setCompiledSource(request.source);setError('');}
      }
      send.current();
    };
    return ()=>{disposed=true;clear();w.terminate();worker.current=null;send.current=()=>{};};
  },[attempt]);
  useEffect(()=>{
    const id=++sequence.current;pending.current=null;setBusy(true);setError('');
    const debounce=setTimeout(()=>{
      if(!worker.current){setBusy(false);setError('预览引擎尚未就绪，请点击重新预览。正文仍可下载为 MD。');return;}
      pending.current={id,source};send.current();
    },180);
    return ()=>clearTimeout(debounce);
  },[source,attempt]);
  return {result,error,busy,fresh:compiledSource===source&&!error&&!busy,retry:()=>setAttempt(n=>n+1)};
}
