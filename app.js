'use strict';
// Fox Avatar V0.5.3: WebGL2 browser implementation of the 2.5D image-mask shader.
// Source art/masks come from the original Godot project; this is a standalone web port.
const HAIR_NAMES = ['Ink Black','Moon Silver','Crimson Wine','Sakura Rose'];
const HAIR_GAINS = [[1,1,1],[2.08,2.13,2.22],[1.68,.79,.92],[1.56,1.10,1.48]];
const HAIR_LIFTS = [[0,0,0],[.11,.10,.13],[.015,0,0],[.035,.01,.02]];
const FABRIC_NAMES = ['Jade & Ivory','Plum Dream','Coral Bloom','Blue Pearl'];
const FABRIC_COLORS = [[.35,.67,.60],[.62,.35,.70],[.90,.43,.44],[.33,.57,.86]];
const FABRIC_GAINS = [[1,1,1],[1.66,.82,1.39],[1.89,.84,.80],[.77,1.05,1.55]];

const vertex = `#version 300 es
in vec2 aPosition;
out vec2 uv;
void main() { uv = (aPosition + 1.0)*0.5; gl_Position = vec4(aPosition,0.0,1.0); }`;
const fragment = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 fragColor;
uniform sampler2D art;
uniform sampler2D maskTail;
uniform sampler2D maskHair;
uniform sampler2D maskOutfit;
uniform float waveTime;
uniform float tailAnimation;
uniform vec3 hairGain;
uniform vec3 hairLift;
uniform vec3 outfitGain;
uniform vec3 outfitColor;
uniform float hairStrength;
uniform float outfitStrength;
void main() {
    float tailArea = texture(maskTail, uv).r;
    float phase = waveTime * 1.43;
    vec2 delta = vec2(
        sin(phase + uv.y*9.0) * 0.013,
        sin(phase*0.7 + uv.x*12.0) * 0.0038
    ) * tailArea * tailAnimation;
    vec2 warpedUv = clamp(uv-delta, vec2(0.001), vec2(0.999));
    vec4 col = texture(art, warpedUv);
    float h = texture(maskHair,warpedUv).r;
    float d = texture(maskOutfit,warpedUv).r;
    vec3 hairTone = clamp(col.rgb*hairGain+hairLift, vec3(0.0),vec3(1.0));
    col.rgb = mix(col.rgb,hairTone,clamp(h*hairStrength,0.0,1.0));
    float lum = dot(col.rgb,vec3(0.213,0.715,0.072));
    vec3 fabricTone = clamp(outfitColor*(0.50+lum*0.85),vec3(0.0),vec3(1.0));
    col.rgb = mix(col.rgb,fabricTone,clamp(d*outfitStrength,0.0,1.0));
    fragColor = col;
}`;

const canvas = document.getElementById('portrait');
const loadNode = document.getElementById('loading');
const canvasFrame = document.querySelector('.canvas-frame');
const tailToggle = document.getElementById('tailToggle');
const status = document.getElementById('tailLabel');
const state = { hair:0, fabric:0, tail:true, scale:1, x:0, y:0, dragging:false, pointerX:0, pointerY:0 };
let gl, program, uniforms, twoD = null, lastSeconds = 0, started = false;
const pageStart = performance.now();

function setHair(i) {
    state.hair = Math.max(0, Math.min(3,i));
    document.getElementById('hairLabel').textContent = HAIR_NAMES[state.hair];
    document.querySelectorAll('[data-hair]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.hair === state.hair)));
    if(twoD) twoD.rebuild();
}
function setFabric(i) {
    state.fabric = Math.max(0, Math.min(3,i));
    document.getElementById('fabricLabel').textContent = FABRIC_NAMES[state.fabric];
    document.querySelectorAll('[data-fabric]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.fabric === state.fabric)));
    if(twoD) twoD.rebuild();
}
function toggleTail() {
    state.tail = !state.tail;
    tailToggle.setAttribute('aria-pressed', String(state.tail));
    tailToggle.querySelector('strong').textContent = state.tail ? 'ON' : 'OFF';
    status.textContent = `TAIL MOTION: ${state.tail ? 'ON' : 'OFF'}`;
}
function reset() {state.scale=1;state.x=0;state.y=0;positionCanvas();}
function positionCanvas() {
    // The 2.5D art has very gentle breathing like in the Godot project.
    const drift = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : Math.sin(lastSeconds*1.24)*1.7;
    canvas.style.transform = `translate3d(${state.x}px,${state.y+drift}px,0) scale(${state.scale})`;
}
for (const button of document.querySelectorAll('[data-hair]')) button.addEventListener('click',()=>setHair(+button.dataset.hair));
for (const button of document.querySelectorAll('[data-fabric]')) button.addEventListener('click',()=>setFabric(+button.dataset.fabric));
tailToggle.addEventListener('click',toggleTail);
document.getElementById('resetView').addEventListener('click',reset);
document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || ['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) return;
    const key=e.key.toLowerCase();
    if ('1234'.includes(key) && key.length === 1) setHair(+key-1);
    else if(key==='c') setFabric((state.fabric+1)%4);
    else if(key==='t') toggleTail();
    else if(key==='r') reset();
});
canvas.addEventListener('pointerdown',e=>{
    if (e.button !== 0) return;
    canvas.setPointerCapture(e.pointerId);
    state.dragging=true;state.pointerX=e.clientX;state.pointerY=e.clientY;
    canvasFrame.classList.add('dragging');e.preventDefault();
});
canvas.addEventListener('pointermove',e=>{
    if(!state.dragging) return;
    state.x=Math.max(-120,Math.min(120,state.x+e.clientX-state.pointerX));
    state.y=Math.max(-90,Math.min(90,state.y+e.clientY-state.pointerY));
    state.pointerX=e.clientX;state.pointerY=e.clientY;
    positionCanvas();
});
function stopDragging(){state.dragging=false;canvasFrame.classList.remove('dragging');}
canvas.addEventListener('pointerup',stopDragging);
canvas.addEventListener('pointercancel',stopDragging);
canvas.addEventListener('lostpointercapture',stopDragging);
canvas.addEventListener('wheel',e=>{
    e.preventDefault();state.scale=Math.max(.76,Math.min(1.55,state.scale+(e.deltaY<0?.07:-.07)));
    positionCanvas();
},{passive:false});

function compile(gl,type,source){
    const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader)||'WebGL shader compilation failed');
    return shader;
}
function makeProgram(gl){
    const p=gl.createProgram();gl.attachShader(p,compile(gl,gl.VERTEX_SHADER,vertex));
    gl.attachShader(p,compile(gl,gl.FRAGMENT_SHADER,fragment));gl.linkProgram(p);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(p)||'WebGL program link failed');
    return p;
}
async function loadImage(src){
    return new Promise((resolve,reject)=>{
        const img=new Image();img.crossOrigin='anonymous';img.decoding='async';img.onload=()=>resolve(img);
        img.onerror=()=>reject(Error('Unable to load '+src));img.src=src;
    });
}
function uploadTexture(gl, img, index){
    const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0+index);gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    return texture;
}
function resizeCanvas(){
    if(!gl) return;
    const rect=canvas.getBoundingClientRect();
    // Avoid using transformed canvas dimensions when scaling/panning.
    const intrinsicWidth=Math.max(350,Math.min(1024,Math.round(canvasFrame.clientWidth*Math.min(devicePixelRatio||1,2))));
    const intrinsicHeight=Math.round(intrinsicWidth*1.5);
    if(canvas.width!==intrinsicWidth || canvas.height!==intrinsicHeight){canvas.width=intrinsicWidth;canvas.height=intrinsicHeight;}
    gl.viewport(0,0,canvas.width,canvas.height);
}
function render(t){
    if(!started) return;
    lastSeconds=(t-pageStart)/1000;
    resizeCanvas();
    gl.useProgram(program);
    gl.uniform1f(uniforms.waveTime,lastSeconds);
    gl.uniform1f(uniforms.tailAnimation,state.tail ? 1:0);
    gl.uniform3fv(uniforms.hairGain,HAIR_GAINS[state.hair]);
    gl.uniform3fv(uniforms.hairLift,HAIR_LIFTS[state.hair]);
    gl.uniform1f(uniforms.hairStrength,state.hair===0?0:.82);
    gl.uniform3fv(uniforms.outfitGain,FABRIC_GAINS[state.fabric]);
    gl.uniform3fv(uniforms.outfitColor,FABRIC_COLORS[state.fabric]);
    gl.uniform1f(uniforms.outfitStrength,state.fabric===0?0:.98);
    gl.drawArrays(gl.TRIANGLES,0,6);
    positionCanvas();
    requestAnimationFrame(render);
}
// Canvas2D fallback lets the same controls work even when WebGL2 is unavailable.
// Image masks are recolored only when a palette changes, not on every frame.
async function startCanvas2D(paths){
    const images=await Promise.all(paths.map(loadImage));
    const w=640,h=960;
    canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d',{alpha:false});
    if(!ctx) throw Error('Canvas2D unavailable');
    function surface(img){
        const c=document.createElement('canvas');c.width=w;c.height=h;
        const x=c.getContext('2d',{willReadFrequently:true});
        x.drawImage(img,0,0,w,h);
        return x.getImageData(0,0,w,h).data;
    }
    const original=surface(images[0]);
    const tailMask=surface(images[1]);
    const hairMask=surface(images[2]);
    const outfitMask=surface(images[3]);
    const colored=document.createElement('canvas');colored.width=w;colored.height=h;
    const overlay=document.createElement('canvas');overlay.width=w;overlay.height=h;
    const cctx=colored.getContext('2d');
    const octx=overlay.getContext('2d');
    twoD={ctx,colored,overlay,rebuild:()=>{
        const out=cctx.createImageData(w,h), tail=octx.createImageData(w,h);
        const gain=HAIR_GAINS[state.hair],lift=HAIR_LIFTS[state.hair],fabric=FABRIC_COLORS[state.fabric];
        const hs=state.hair===0 ? 0 : .82;
        const fs=state.fabric===0 ? 0 : .98;
        for(let i=0;i<original.length;i+=4){
            let r=original[i]/255,g=original[i+1]/255,b=original[i+2]/255;
            const hmix=hairMask[i]/255*hs;
            const dmix=outfitMask[i]/255*fs;
            r=r*(1-hmix)+Math.min(1,Math.max(0,r*gain[0]+lift[0]))*hmix;
            g=g*(1-hmix)+Math.min(1,Math.max(0,g*gain[1]+lift[1]))*hmix;
            b=b*(1-hmix)+Math.min(1,Math.max(0,b*gain[2]+lift[2]))*hmix;
            const lum=r*.213+g*.715+b*.072;
            const shade=.50+lum*.85;
            r=r*(1-dmix)+Math.min(1,Math.max(0,fabric[0]*shade))*dmix;
            g=g*(1-dmix)+Math.min(1,Math.max(0,fabric[1]*shade))*dmix;
            b=b*(1-dmix)+Math.min(1,Math.max(0,fabric[2]*shade))*dmix;
            out.data[i]=tail.data[i]=Math.round(r*255);
            out.data[i+1]=tail.data[i+1]=Math.round(g*255);
            out.data[i+2]=tail.data[i+2]=Math.round(b*255);
            out.data[i+3]=255;
            tail.data[i+3]=Math.round(tailMask[i]/255*185);
        }
        cctx.putImageData(out,0,0);octx.putImageData(tail,0,0);
    }};
    twoD.rebuild();
    started=true;
    loadNode.classList.add('hidden');
    requestAnimationFrame(render2D);
}
function render2D(t){
    if(!started || !twoD) return;
    lastSeconds=(t-pageStart)/1000;
    const c=twoD.ctx;
    c.drawImage(twoD.colored,0,0);
    if(state.tail){
        // Small moving masked fox-tail overlay. The WebGL path uses per-pixel warping.
        for(let y=0;y<canvas.height;y+=12){
            const strip=Math.min(12,canvas.height-y);
            const uv=1-(y+strip*.5)/canvas.height;
            const dx=Math.sin(lastSeconds*1.43+uv*9)*6.5;
            c.drawImage(twoD.overlay,0,y,canvas.width,strip,dx,y,canvas.width,strip);
        }
    }
    positionCanvas();
    requestAnimationFrame(render2D);
}

function showError(err){
    console.error('Fox Avatar Web:',err);
    loadNode.classList.add('error');
    loadNode.textContent='角色无法加载，请检查图片文件是否完整，并通过 HTTPS 或本地网站服务打开。';
    canvas.style.display='none';
    const img=document.createElement('img');img.src='assets/fox_hero.png';img.alt='狐狸女孩静态立绘';
    img.style.cssText='width:100%;height:100%;object-fit:cover';
    canvasFrame.appendChild(img);
    loadNode.style.position='absolute';loadNode.style.height='auto';loadNode.style.inset='auto 0 0';
    // Avoid pretending the controls are working if WebGL2 isn't available.
    document.querySelectorAll('button').forEach(button=>{button.disabled=true;button.title='WebGL2 不可用，当前仅能显示原始图片';});
}
async function start(){
    try{
        gl=canvas.getContext('webgl2',{alpha:false,antialias:true,preserveDrawingBuffer:false});
        if(!gl) {
            await startCanvas2D(['assets/fox_hero.png','assets/mask_tail.png','assets/mask_hair.png','assets/mask_outfit.png']);
            return;
        }
        program=makeProgram(gl);gl.useProgram(program);
        const names=['art','maskTail','maskHair','maskOutfit','waveTime','tailAnimation','hairGain','hairLift','outfitGain','outfitColor','hairStrength','outfitStrength'];
        uniforms=Object.fromEntries(names.map(n=>[n,gl.getUniformLocation(program,n)]));
        const images=await Promise.all([
            'assets/fox_hero.png','assets/mask_tail.png','assets/mask_hair.png','assets/mask_outfit.png'
        ].map(loadImage));
        images.forEach((img,i)=>uploadTexture(gl,img,i));
        for(const [i,name] of ['art','maskTail','maskHair','maskOutfit'].entries()) gl.uniform1i(uniforms[name],i);
        const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
        const loc=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
        resizeCanvas();started=true;loadNode.classList.add('hidden');requestAnimationFrame(render);
    }catch(err){showError(err);}
}
start();
