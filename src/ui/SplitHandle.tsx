import { useRef } from 'react';
export function SplitHandle({value,onChange}:{value:number;onChange:(value:number)=>void}) {
  const dragging = useRef(false);
  const update = (clientX:number,el:HTMLElement) => {
    const parent=el.closest('.workbench')!, box=parent.getBoundingClientRect();
    const side=parent.querySelector<HTMLElement>('.inspector');
    const sideWidth=side && getComputedStyle(side).position!=='absolute' ? side.getBoundingClientRect().width : 0;
    onChange(Math.max(25,Math.min(75,Math.round((clientX-box.left)/(box.width-sideWidth)*100))));
  };
  return <div className="split-handle" role="separator" tabIndex={0} aria-label="调整编辑与预览宽度" aria-orientation="vertical" aria-valuemin={25} aria-valuemax={75} aria-valuenow={value}
    onPointerDown={e=>{dragging.current=true;e.currentTarget.focus();e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault();}}
    onPointerMove={e=>{if(dragging.current)update(e.clientX,e.currentTarget);}}
    onPointerUp={()=>{dragging.current=false;}} onPointerCancel={()=>{dragging.current=false;}}
    onDoubleClick={()=>onChange(50)}
    onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();onChange(e.key==='Home'?25:e.key==='End'?75:Math.max(25,Math.min(75,value+(e.key==='ArrowLeft'?-2:2))));}}}
    title="拖动调整宽度；双击恢复均分；方向键微调" />;
}
