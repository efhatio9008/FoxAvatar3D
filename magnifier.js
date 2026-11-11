'use strict';
// V0.7.1: independent viewer mirroring the LIVE animated/color-tinted portrait canvas.
// It never changes the main portrait's pan/zoom, avatar state or animation switches.
(() => {
    const source=document.getElementById('portrait');
    const dialog=document.getElementById('magnifierDialog');
    const stage=document.getElementById('magnifierViewport');
    const canvas=document.getElementById('magnifierCanvas');
    const context=canvas.getContext('2d',{alpha:false});
    const openButton=document.getElementById('openMagnifier');
    // The magnifier is desktop-only; include landscape phones with coarse touch.
    const mobileLayout=window.matchMedia('(max-width: 725px), (hover: none) and (pointer: coarse)');
    const closeButton=document.getElementById('closeMagnifier');
    const zoomLabel=document.getElementById('magnifierZoom');
    const touches=new Map();
    let opened=false, zoom=1, panX=0, panY=0, fitW=1, fitH=1, pinch=null;
    let previousFocus=null;
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    function measure(){
        if(!opened)return;
        const bounds=stage.getBoundingClientRect();
        const aspect=source.width/Math.max(1,source.height);
        fitW=Math.min(Math.max(1,bounds.width-16),Math.max(1,bounds.height-16)*aspect);
        fitH=fitW/aspect;
        canvas.style.width=fitW+'px';canvas.style.height=fitH+'px';
        clampPan();renderTransform();
    }
    function clampPan(){
        const width=stage.clientWidth,height=stage.clientHeight;
        panX=clamp(panX,-Math.max(0,(fitW*zoom-width)/2),Math.max(0,(fitW*zoom-width)/2));
        panY=clamp(panY,-Math.max(0,(fitH*zoom-height)/2),Math.max(0,(fitH*zoom-height)/2));
    }
    function renderTransform(){
        canvas.style.transform='translate(-50%,-50%) translate('+panX+'px,'+panY+'px) scale('+zoom+')';
        zoomLabel.textContent=Math.round(zoom*100)+'%';
    }
    function zoomAt(value,clientX,clientY){
        const next=clamp(value,1,4.5);
        const r=stage.getBoundingClientRect();
        const centerX=(clientX??(r.left+r.width/2))-r.left-r.width/2;
        const centerY=(clientY??(r.top+r.height/2))-r.top-r.height/2;
        const ratio=next/zoom;
        panX=centerX-(centerX-panX)*ratio;
        panY=centerY-(centerY-panY)*ratio;
        zoom=next;clampPan();renderTransform();
    }
    function fit(){zoom=1;panX=0;panY=0;clampPan();renderTransform();}
    function updateTitle(){
        document.getElementById('magnifierTitle').textContent=document.getElementById('switchName').textContent;
    }
    function open(){
        if(opened||mobileLayout.matches)return;
        previousFocus=document.activeElement;
        updateTitle();
        dialog.hidden=false;document.body.classList.add('magnifier-visible');
        opened=true;zoom=1;panX=0;panY=0;
        measure();
        stage.focus({preventScroll:true});
    }
    function close(){
        if(!opened)return;
        touches.clear();pinch=null;stage.classList.remove('dragging');
        opened=false;dialog.hidden=true;document.body.classList.remove('magnifier-visible');
        if(previousFocus?.focus)previousFocus.focus({preventScroll:true});
    }
    function updateMirror(){
        if(!opened||!source.width||!source.height)return;
        if(canvas.width!==source.width||canvas.height!==source.height){
            canvas.width=source.width;canvas.height=source.height;
            measure();
        }
        // Called immediately after the original WebGL/2D draw, before WebGL's buffer clears.
        context.drawImage(source,0,0,canvas.width,canvas.height);
    }
    window.avatarMagnifierFrame=updateMirror;
    openButton.addEventListener('click',open);
    closeButton.addEventListener('click',close);
    dialog.addEventListener('pointerdown',e=>{if(e.target===dialog)close();});
    document.getElementById('magnifierPlus').addEventListener('click',()=>zoomAt(zoom*1.35));
    document.getElementById('magnifierMinus').addEventListener('click',()=>zoomAt(zoom/1.35));
    document.getElementById('magnifierFit').addEventListener('click',fit);
    stage.addEventListener('wheel',e=>{if(!opened)return;e.preventDefault();zoomAt(zoom*(e.deltaY<0?1.16:1/1.16),e.clientX,e.clientY);},{passive:false});
    stage.addEventListener('dblclick',e=>{e.preventDefault();zoomAt(zoom>2.5?1:zoom*1.7,e.clientX,e.clientY);});
    function pair(){return [...touches.values()].slice(0,2);}
    function beginPinch(){
        if(touches.size<2){pinch=null;return;}
        const [a,b]=pair();
        pinch={length:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),zoom,
            midX:(a.x+b.x)/2,midY:(a.y+b.y)/2,panX,panY};
    }
    stage.addEventListener('pointerdown',e=>{
        if(!opened||(e.pointerType==='mouse'&&e.button!==0))return;
        try{stage.setPointerCapture(e.pointerId);}catch(_){}
        touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
        if(touches.size===2)beginPinch();
        stage.classList.add('dragging');e.preventDefault();
    });
    stage.addEventListener('pointermove',e=>{
        if(!opened||!touches.has(e.pointerId))return;
        const before=touches.get(e.pointerId);
        touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
        if(touches.size===1){
            panX+=e.clientX-before.x;panY+=e.clientY-before.y;
            clampPan();renderTransform();
        }else if(touches.size>=2){
            if(!pinch)beginPinch();
            const [a,b]=pair();
            const length=Math.max(1,Math.hypot(a.x-b.x,a.y-b.y));
            const midX=(a.x+b.x)/2,midY=(a.y+b.y)/2;
            const next=clamp(pinch.zoom*length/pinch.length,1,4.5);
            const r=stage.getBoundingClientRect();
            const anchorX=pinch.midX-r.left-r.width/2;
            const anchorY=pinch.midY-r.top-r.height/2;
            const ratio=next/pinch.zoom;
            panX=midX-r.left-r.width/2-(anchorX-pinch.panX)*ratio;
            panY=midY-r.top-r.height/2-(anchorY-pinch.panY)*ratio;
            zoom=next;clampPan();renderTransform();
        }
        e.preventDefault();
    });
    function release(e){
        touches.delete(e.pointerId);
        if(touches.size>=2)beginPinch();else pinch=null;
        if(!touches.size)stage.classList.remove('dragging');
    }
    for(const type of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(type,release);
    window.addEventListener('keydown',e=>{
        if(!opened)return;
        if(e.key==='Escape'){e.preventDefault();close();}
        else if(e.key==='+'||e.key==='='){e.preventDefault();zoomAt(zoom*1.35);}
        else if(e.key==='-'){e.preventDefault();zoomAt(zoom/1.35);}
        else if(e.key.toLowerCase()==='r'||e.key==='0'){e.preventDefault();fit();}
        else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
            e.preventDefault();const d=50;
            panX+=e.key==='ArrowLeft'?d:e.key==='ArrowRight'?-d:0;
            panY+=e.key==='ArrowUp'?d:e.key==='ArrowDown'?-d:0;
            clampPan();renderTransform();
        }
    });
    function handleLayoutChange(){
        if(mobileLayout.matches)close();
        else measure();
    }
    mobileLayout.addEventListener('change',handleLayoutChange);
    window.addEventListener('resize',handleLayoutChange,{passive:true});
})();
