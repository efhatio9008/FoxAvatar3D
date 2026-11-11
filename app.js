'use strict';
// Four-character website upgrade from the user's V0.6.0 HTML, using Godot V0.2.5 artwork,
// motion equations, independent toggles and protected-limb/source safety masks.
const HAIR_NAMES = ['Ink Black','Moon Silver','Crimson Wine','Sakura Rose'];
const HAIR_GAINS = [[1,1,1],[2.08,2.13,2.22],[1.68,.79,.92],[1.56,1.10,1.48]];
const HAIR_LIFTS = [[0,0,0],[.11,.10,.13],[.015,0,0],[.035,.01,.02]];
const FABRIC_NAMES = ['Jade & Ivory','Plum Dream','Coral Bloom','Blue Pearl'];
const FABRIC_COLORS = [[.35,.67,.60],[.62,.35,.70],[.90,.43,.44],[.33,.57,.86]];
const CHAR_ORDER = ['fox','snake','cat','dragon'];
const SHARED_NOTE = '本版专注 2.5D 精细立绘：尾巴、左右两侧头发与外层衣袖／裙摆可分别开关飘动；脸、肩膀、手臂、手指、大腿、双脚与身体保持静止。发色和衣饰换色只作用于局部，不改变发型或服装款式。无眨眼、无旧 3D 跳转。';
const CHARACTERS = {
    fox: {
        name:'狐女 · FOX', title:'狐灵 <span>·</span> 花影',
        description:'一幅有细腻立体感的国风狐娘立绘，狐尾、双侧长发与外层衣饰都可轻柔飘动。',
        tailName:'狐尾轻摆',tailStatus:'FOX TAIL MOTION',tailFeature:'Tail motion · 狐尾轻摆',
        label:'可以拖动、缩放的国风狐狸女孩 2.5D 立绘',width:1024,height:1536
    },
    snake: {
        name:'蛇女 · SNAKE',title:'蛇姬 <span>·</span> 阴影',
        description:'细腻华美的国风蛇姬，盘绕蛇尾与红宝石吊坠相随摆动，双侧发丝和近地轻纱裙摆柔和飘动。',
        tailName:'蛇尾与吊坠轻摆',tailStatus:'SNAKE TAIL + PENDANT',tailFeature:'Tail motion · 蛇尾与吊坠',
        label:'可以拖动、缩放的国风蛇女 2.5D 立绘',width:879,height:1410
    },
    cat: {
        name:'猫女 · CAT',title:'猫灵 <span>·</span> 月影',
        description:'灵动优雅的幻想风猫女，猫尾轻摆，双侧长发与衣袖裙摆独立飘动，保留原画神态与坐姿。',
        tailName:'猫尾轻摆',tailStatus:'CAT TAIL MOTION',tailFeature:'Tail motion · 猫尾轻摆',
        label:'可以拖动、缩放的国风猫女 2.5D 立绘',width:879,height:1410
    },
    dragon: {
        name:'龙女 · DRAGON',title:'龙姬 <span>·</span> 云影',
        description:'华丽灵秀的幻想风龙女，龙尾、双侧发丝及外层衣裙轻舞，近地的下层裙摆具有独立增强飘动。',
        tailName:'龙尾轻摆',tailStatus:'DRAGON TAIL MOTION',tailFeature:'Tail motion · 龙尾轻摆',
        label:'可以拖动、缩放的国风龙女 2.5D 立绘',width:879,height:1410
    }
};

// Each packed RGB mask is a lossless combination of 3 original Godot grayscale PNGs:
// A = (tail, hair_left, hair_right), B = (fabric_motion, protect, motion_guard),
// C = (hair_tint, outfit_tint, hem_motion), P = (snake pendant, 0, 0).
const artPaths = who => [
    `assets/${who}_hero.png`, `assets/${who}_motion_a.png`,
    `assets/${who}_motion_b.png`, `assets/${who}_motion_c.png`,
    who === 'snake' ? 'assets/snake_pendant.png' : 'assets/empty.png'
];
const getImages = who => Promise.all(artPaths(who).map(loadImage));
const currentArt = () => CHARACTERS[activeCharacter];
const defaultState = () => ({hair:0,fabric:0,tail:true,hairMotion:true,fabricMotion:true,scale:1,x:0,y:0});
const characterStates = Object.fromEntries(CHAR_ORDER.map(who=>[who,defaultState()]));
let activeCharacter='fox',state=characterStates.fox;
let gl=null,program=null,uniforms=null,started=false,switching=false;
let currentTextures=null,twoD=null,lastSeconds=0,last2DFrame=0;
const pageStart=performance.now();
const canvas=document.getElementById('portrait');
const canvasFrame=document.querySelector('.canvas-frame');
const loadNode=document.getElementById('loading');
const switches=[document.getElementById('previousCharacter'),document.getElementById('nextCharacter')];
const toggles={tail:document.getElementById('tailToggle'),hairMotion:document.getElementById('hairMotionToggle'),fabricMotion:document.getElementById('fabricMotionToggle')};
const pointers=new Map();
let pinch=null;

function updateToggle(type) {
    const button=toggles[type],on=state[type],who=currentArt();
    const title=type==='tail'?who.tailName:type==='hairMotion'?'双侧头发飘动':'外层衣服飘动';
    const prefix=type==='tail'?who.tailStatus:type==='hairMotion'?'HAIR MOTION':'FABRIC MOTION';
    button.setAttribute('aria-pressed',String(on));
    button.querySelector('strong').textContent=on?'ON':'OFF';
    button.querySelector('.motion-name').textContent='✦ '+title;
    document.getElementById(type==='tail'?'tailLabel':type==='hairMotion'?'hairMotionLabel':'fabricMotionLabel').textContent=prefix+': '+(on?'ON':'OFF');
}
function toggleMotion(type){ state[type]=!state[type];updateToggle(type); }
function setHair(i){
    state.hair=Math.max(0,Math.min(3,i));
    document.getElementById('hairLabel').textContent=HAIR_NAMES[state.hair];
    document.querySelectorAll('[data-hair]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.hair===state.hair)));
}
function setFabric(i){
    state.fabric=Math.max(0,Math.min(3,i));
    document.getElementById('fabricLabel').textContent=FABRIC_NAMES[state.fabric];
    document.querySelectorAll('[data-fabric]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.fabric===state.fabric)));
}
function positionCanvas(){
    // The body must stay fixed: no global breathing/bobbing/idle movement.
    canvas.style.transform=`translate3d(${state.x}px,${state.y}px,0) scale(${state.scale})`;
}
function reset(){state.scale=1;state.x=0;state.y=0;positionCanvas();}
function updateCharacterUI(){
    const info=currentArt(),idx=CHAR_ORDER.indexOf(activeCharacter);
    document.body.dataset.character=activeCharacter;
    document.getElementById('characterTitle').innerHTML=info.title;
    document.getElementById('characterDescription').textContent=info.description;
    document.getElementById('characterNote').textContent=SHARED_NOTE;
    document.getElementById('featureTail').textContent=info.tailFeature;
    document.getElementById('switchName').textContent=info.name;
    document.getElementById('switchIndex').textContent=String(idx+1).padStart(2,'0')+' / 04';
    canvas.setAttribute('aria-label',info.label);
    canvasFrame.style.setProperty('--art-ratio',String(info.width/info.height));
    switches[0].setAttribute('aria-label','切换到'+CHARACTERS[CHAR_ORDER[(idx+3)%4]].name);
    switches[1].setAttribute('aria-label','切换到'+CHARACTERS[CHAR_ORDER[(idx+1)%4]].name);
    setHair(state.hair);setFabric(state.fabric);
    for(const type of Object.keys(toggles))updateToggle(type);
    positionCanvas();
}
async function setCharacter(next){
    if(switching || next===activeCharacter || !CHARACTERS[next])return;
    switching=true;
    switches.forEach(b=>b.disabled=true);
    loadNode.textContent='正在切换到'+CHARACTERS[next].name+'…';
    loadNode.classList.remove('hidden','error');
    let newTextures=null;
    try{
        const images=await getImages(next);
        if(gl){
            newTextures=images.map((img,i)=>uploadTexture(gl,img,i));
            bindTextures(newTextures);
        }else{
            twoD=buildCanvas2DSet(images);
            canvas.width=twoD.width;canvas.height=twoD.height;
        }
        const oldTextures=currentTextures;
        if(gl)currentTextures=newTextures;
        activeCharacter=next;state=characterStates[next];
        pointers.clear();pinch=null;canvasFrame.classList.remove('dragging');
        updateCharacterUI();
        if(gl&&oldTextures)oldTextures.forEach(tex=>gl.deleteTexture(tex));
        loadNode.classList.add('hidden');
    }catch(err){
        console.error('Character switch failed:',err);
        if(gl){
            if(newTextures)newTextures.forEach(tex=>gl.deleteTexture(tex));
            if(currentTextures)bindTextures(currentTextures);
        }
        loadNode.textContent='角色切换失败，请刷新网页重试。';
        loadNode.classList.add('error');
    }finally{
        switching=false;switches.forEach(b=>b.disabled=false);
    }
}
function cycleCharacter(offset){
    const idx=CHAR_ORDER.indexOf(activeCharacter);
    return setCharacter(CHAR_ORDER[(idx+offset+4)%4]);
}
switches[0].addEventListener('click',()=>cycleCharacter(-1));
switches[1].addEventListener('click',()=>cycleCharacter(1));
for(const b of document.querySelectorAll('[data-hair]'))b.addEventListener('click',()=>setHair(+b.dataset.hair));
for(const b of document.querySelectorAll('[data-fabric]'))b.addEventListener('click',()=>setFabric(+b.dataset.fabric));
for(const type of Object.keys(toggles))toggles[type].addEventListener('click',()=>toggleMotion(type));
document.getElementById('resetView').addEventListener('click',reset);
document.addEventListener('keydown',e=>{
    if(document.getElementById('magnifierDialog')?.hidden===false)return;
    if(e.altKey||e.ctrlKey||e.metaKey||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
    const k=e.key.toLowerCase();
    if(k==='arrowleft'){e.preventDefault();cycleCharacter(-1);}
    else if(k==='arrowright'){e.preventDefault();cycleCharacter(1);}
    else if('1234'.includes(k)&&k.length===1)setHair(+k-1);
    else if(k==='c')setFabric((state.fabric+1)%4);
    else if(k==='t')toggleMotion('tail');
    else if(k==='h')toggleMotion('hairMotion');
    else if(k==='f')toggleMotion('fabricMotion');
    else if(k==='r')reset();
});
function pointerPair(){return [...pointers.values()].slice(0,2);}
function resetPinch(){
    if(pointers.size<2){pinch=null;return;}
    const [a,b]=pointerPair();
    pinch={distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),scale:state.scale,
        x:state.x,y:state.y,cx:(a.x+b.x)/2,cy:(a.y+b.y)/2};
}
canvas.addEventListener('pointerdown',e=>{
    if(switching || (e.pointerType==='mouse'&&e.button!==0))return;
    try{canvas.setPointerCapture(e.pointerId);}catch(_e){}
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2)resetPinch();
    canvasFrame.classList.add('dragging');e.preventDefault();
});
canvas.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId)||switching)return;
    const previous=pointers.get(e.pointerId);
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===1){
        state.x=Math.max(-160,Math.min(160,state.x+e.clientX-previous.x));
        state.y=Math.max(-120,Math.min(120,state.y+e.clientY-previous.y));
    }else if(pointers.size>=2){
        if(!pinch)resetPinch();
        const [a,b]=pointerPair(),distance=Math.max(1,Math.hypot(a.x-b.x,a.y-b.y));
        state.scale=Math.max(.76,Math.min(1.65,pinch.scale*distance/pinch.distance));
        state.x=Math.max(-160,Math.min(160,pinch.x+(a.x+b.x)/2-pinch.cx));
        state.y=Math.max(-120,Math.min(120,pinch.y+(a.y+b.y)/2-pinch.cy));
    }
    positionCanvas();e.preventDefault();
});
function pointerEnd(e){
    pointers.delete(e.pointerId);
    if(pointers.size>=2)resetPinch();else pinch=null;
    if(!pointers.size)canvasFrame.classList.remove('dragging');
}
for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,pointerEnd);
canvas.addEventListener('wheel',e=>{
    e.preventDefault();
    state.scale=Math.max(.76,Math.min(1.65,state.scale+(e.deltaY<0?.07:-.07)));
    positionCanvas();
},{passive:false});
updateCharacterUI();

// The fragment code directly mirrors the V0.2.5 Godot shader (including source-side
// immovable-part rejection), with masks packed to minimize texture units on phones.
const fragmentBody=`
uniform sampler2D art;
uniform sampler2D motionA;
uniform sampler2D motionB;
uniform sampler2D motionC;
uniform sampler2D pendantMask;
uniform float waveTime;
uniform float tailAnimation;
uniform float hairAnimation;
uniform float fabricAnimation;
uniform vec3 hairGain;
uniform vec3 hairLift;
uniform vec3 outfitColor;
uniform float hairStrength;
uniform float outfitStrength;
vec4 shadeAvatar(){
    vec2 pos=uv;
    vec3 a=TEX(motionA,pos).rgb;
    vec3 b=TEX(motionB,pos).rgb;
    vec3 c=TEX(motionC,pos).rgb;
    float keepStill=clamp(b.g,0.0,1.0);
    float movable=1.0-keepStill;
    float tp=waveTime*1.58;
    vec2 tailWave=vec2(
        sin(tp+pos.y*9.0)*0.0260,
        sin(tp*0.72+pos.x*11.0)*0.0054
    )*a.r*tailAnimation;
    float pendantArea=TEX(pendantMask,pos).r;
    float pendantFalloff=smoothstep(0.190,0.300,pos.y);
    vec2 pendantWave=vec2(
        sin(tp*0.86-0.35)*0.0145,
        sin(tp*0.64+0.80)*0.0019
    )*pendantArea*pendantFalloff*tailAnimation;
    vec2 leftWave=vec2(
        sin(waveTime*1.19+pos.y*5.8)*0.0305,
        sin(waveTime*0.90+pos.y*4.1)*0.0042
    )*a.g;
    vec2 rightWave=vec2(
        sin(waveTime*1.05+pos.y*6.4+1.10)*0.0355,
        sin(waveTime*0.86+pos.y*3.7+0.6)*0.0049
    )*a.b;
    vec2 hairWave=(leftWave+rightWave)*hairAnimation;
    vec2 fabricWave=vec2(
        sin(waveTime*0.91+pos.y*8.0+pos.x*4.0)*0.0188,
        sin(waveTime*0.70+pos.x*8.5)*0.0056
    )*b.r*fabricAnimation;
    vec2 hemWave=vec2(
        sin(waveTime*1.04+pos.y*6.5+pos.x*3.0)*0.0205,
        sin(waveTime*0.77+pos.x*7.1+1.2)*0.0064
    )*c.b*fabricAnimation;
    vec2 displacement=(tailWave+pendantWave+hairWave+fabricWave+hemWave)*movable*(1.0-clamp(b.b,0.0,1.0));
    vec2 candidateUv=clamp(pos-displacement,vec2(0.001),vec2(0.999));
    float protectedSource=clamp(TEX(motionB,candidateUv).g,0.0,1.0);
    displacement*=1.0-smoothstep(0.06,0.60,protectedSource);
    vec2 warpedUv=clamp(pos-displacement,vec2(0.001),vec2(0.999));
    vec4 color=TEX(art,warpedUv);
    color=mix(color,TEX(art,pos),keepStill);
    vec3 hairTone=clamp(color.rgb*hairGain+hairLift,vec3(0.0),vec3(1.0));
    color.rgb=mix(color.rgb,hairTone,clamp(c.r*hairStrength,0.0,1.0));
    float lum=dot(color.rgb,vec3(0.213,0.715,0.072));
    vec3 fabricTone=clamp(outfitColor*(0.50+lum*0.85),vec3(0.0),vec3(1.0));
    color.rgb=mix(color.rgb,fabricTone,clamp(c.g*outfitStrength,0.0,1.0));
    return color;
}`;
const vertex300=`#version 300 es\nin vec2 aPosition;out vec2 uv;void main(){uv=(aPosition+1.0)*0.5;gl_Position=vec4(aPosition,0.0,1.0);}`;
const vertex100=`attribute vec2 aPosition;varying vec2 uv;void main(){uv=(aPosition+1.0)*0.5;gl_Position=vec4(aPosition,0.0,1.0);}`;
const fragment300='#version 300 es\nprecision highp float;\nin vec2 uv;out vec4 fragColor;\n#define TEX texture\n'+fragmentBody+'\nvoid main(){fragColor=shadeAvatar();}';
const fragment100='precision highp float;\nvarying vec2 uv;\n#define TEX texture2D\n'+fragmentBody+'\nvoid main(){gl_FragColor=shadeAvatar();}';
function compile(ctx,type,src){
    const shader=ctx.createShader(type);ctx.shaderSource(shader,src);ctx.compileShader(shader);
    if(!ctx.getShaderParameter(shader,ctx.COMPILE_STATUS))throw Error(ctx.getShaderInfoLog(shader)||'GLSL compilation failed');
    return shader;
}
function makeProgram(ctx,webgl2){
    const vertex=compile(ctx,ctx.VERTEX_SHADER,webgl2?vertex300:vertex100);
    const fragment=compile(ctx,ctx.FRAGMENT_SHADER,webgl2?fragment300:fragment100);
    const p=ctx.createProgram();ctx.attachShader(p,vertex);ctx.attachShader(p,fragment);ctx.linkProgram(p);
    ctx.deleteShader(vertex);ctx.deleteShader(fragment);
    if(!ctx.getProgramParameter(p,ctx.LINK_STATUS))throw Error(ctx.getProgramInfoLog(p)||'WebGL link failed');
    return p;
}
function loadImage(src){
    return new Promise((resolve,reject)=>{
        const img=new Image();img.crossOrigin='anonymous';img.decoding='async';
        img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Cannot load '+src));img.src=src;
    });
}
function uploadTexture(ctx,img,i){
    const texture=ctx.createTexture();ctx.activeTexture(ctx.TEXTURE0+i);ctx.bindTexture(ctx.TEXTURE_2D,texture);
    ctx.pixelStorei(ctx.UNPACK_FLIP_Y_WEBGL,true);
    ctx.pixelStorei(ctx.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
    ctx.texImage2D(ctx.TEXTURE_2D,0,ctx.RGBA,ctx.RGBA,ctx.UNSIGNED_BYTE,img);
    ctx.texParameteri(ctx.TEXTURE_2D,ctx.TEXTURE_MIN_FILTER,ctx.LINEAR);
    ctx.texParameteri(ctx.TEXTURE_2D,ctx.TEXTURE_MAG_FILTER,ctx.LINEAR);
    ctx.texParameteri(ctx.TEXTURE_2D,ctx.TEXTURE_WRAP_S,ctx.CLAMP_TO_EDGE);
    ctx.texParameteri(ctx.TEXTURE_2D,ctx.TEXTURE_WRAP_T,ctx.CLAMP_TO_EDGE);
    return texture;
}
function bindTextures(items){
    items.forEach((tex,i)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,tex);});
}
function resizeCanvas(){
    if(!gl)return;
    const w=Math.max(240,Math.min(1024,Math.round(canvasFrame.clientWidth*Math.min(window.devicePixelRatio||1,2))));
    const h=Math.round(w*currentArt().height/currentArt().width);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    gl.viewport(0,0,canvas.width,canvas.height);
}
function renderGL(t){
    if(!started||!gl)return;
    lastSeconds=(t-pageStart)/1000;
    resizeCanvas();
    gl.useProgram(program);
    gl.uniform1f(uniforms.waveTime,lastSeconds);
    gl.uniform1f(uniforms.tailAnimation,state.tail?1:0);
    gl.uniform1f(uniforms.hairAnimation,state.hairMotion?1:0);
    gl.uniform1f(uniforms.fabricAnimation,state.fabricMotion?1:0);
    gl.uniform3fv(uniforms.hairGain,HAIR_GAINS[state.hair]);
    gl.uniform3fv(uniforms.hairLift,HAIR_LIFTS[state.hair]);
    gl.uniform3fv(uniforms.outfitColor,FABRIC_COLORS[state.fabric]);
    gl.uniform1f(uniforms.hairStrength,state.hair===0?0:.82);
    gl.uniform1f(uniforms.outfitStrength,state.fabric===0?0:.98);
    gl.drawArrays(gl.TRIANGLES,0,6);
    if(window.avatarMagnifierFrame)window.avatarMagnifierFrame();
    requestAnimationFrame(renderGL);
}

// A low-resolution software renderer for browsers without either WebGL version.
// It follows the same three motion switches and the protection/guard masks.
function buildCanvas2DSet(images){
    const w=Math.min(320,images[0].naturalWidth);
    const h=Math.round(w*images[0].naturalHeight/images[0].naturalWidth);
    function pixels(img){
        const c=document.createElement('canvas');c.width=w;c.height=h;
        const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,0,0,w,h);
        return x.getImageData(0,0,w,h).data;
    }
    return {width:w,height:h,art:pixels(images[0]),a:pixels(images[1]),b:pixels(images[2]),c:pixels(images[3]),p:pixels(images[4])};
}
const clamp01=n=>Math.min(1,Math.max(0,n));
const clampInt=(n,a,b)=>Math.max(a,Math.min(b,n));
function draw2D(t){
    if(!started||gl)return;
    requestAnimationFrame(draw2D);
    if(t-last2DFrame<65)return;
    last2DFrame=t;
    lastSeconds=(t-pageStart)/1000;
    if(!twoD)return;
    const {width:w,height:h,art,a,b,c,p}=twoD;
    const ctx=canvas.getContext('2d');
    const frame=ctx.createImageData(w,h),out=frame.data;
    const hg=HAIR_GAINS[state.hair],hl=HAIR_LIFTS[state.hair],fc=FABRIC_COLORS[state.fabric];
    const hs=state.hair? .82:0,fs=state.fabric?.98:0,tp=lastSeconds*1.58;
    const tb=state.tail?1:0,hb=state.hairMotion?1:0,fb=state.fabricMotion?1:0;
    for(let y=0;y<h;y++){
        const vy=(y+.5)/h;
        for(let x=0;x<w;x++){
            const i=(y*w+x)*4,vx=(x+.5)/w;
            const still=b[i+1]/255,guard=b[i+2]/255;
            const ta=a[i]/255,le=a[i+1]/255,ri=a[i+2]/255;
            const fall=clamp01((vy-.190)/.110),pendantFalloff=fall*fall*(3-2*fall);
            const fab=b[i]/255,hem=c[i+2]/255,pend=p[i]/255;
            let dx=(Math.sin(tp+vy*9)*.026*ta+Math.sin(tp*.86-.35)*.0145*pend*pendantFalloff)*tb;
            let dy=(Math.sin(tp*.72+vx*11)*.0054*ta+Math.sin(tp*.64+.8)*.0019*pend*pendantFalloff)*tb;
            dx+=(Math.sin(lastSeconds*1.19+vy*5.8)*.0305*le+Math.sin(lastSeconds*1.05+vy*6.4+1.10)*.0355*ri)*hb;
            dy+=(Math.sin(lastSeconds*.90+vy*4.1)*.0042*le+Math.sin(lastSeconds*.86+vy*3.7+.6)*.0049*ri)*hb;
            dx+=(Math.sin(lastSeconds*.91+vy*8+vx*4)*.0188*fab+Math.sin(lastSeconds*1.04+vy*6.5+vx*3)*.0205*hem)*fb;
            dy+=(Math.sin(lastSeconds*.70+vx*8.5)*.0056*fab+Math.sin(lastSeconds*.77+vx*7.1+1.2)*.0064*hem)*fb;
            dx*=(1-still)*(1-guard);dy*=(1-still)*(1-guard);
            let sx=clampInt(Math.round((vx-dx)*w-.5),0,w-1),sy=clampInt(Math.round((vy-dy)*h-.5),0,h-1);
            const sourceProtect=b[(sy*w+sx)*4+1]/255;
            const q=clamp01((sourceProtect-.06)/.54),sourceGuard=1-q*q*(3-2*q);
            sx=clampInt(Math.round((vx-dx*sourceGuard)*w-.5),0,w-1);
            sy=clampInt(Math.round((vy-dy*sourceGuard)*h-.5),0,h-1);
            const z=(sy*w+sx)*4;
            let r=(art[z]*(1-still)+art[i]*still)/255;
            let g=(art[z+1]*(1-still)+art[i+1]*still)/255;
            let bl=(art[z+2]*(1-still)+art[i+2]*still)/255;
            const hm=c[i]/255*hs,dm=c[i+1]/255*fs;
            r=r*(1-hm)+clamp01(r*hg[0]+hl[0])*hm;
            g=g*(1-hm)+clamp01(g*hg[1]+hl[1])*hm;
            bl=bl*(1-hm)+clamp01(bl*hg[2]+hl[2])*hm;
            const shade=.5+(r*.213+g*.715+bl*.072)*.85;
            out[i]=Math.round(255*(r*(1-dm)+clamp01(fc[0]*shade)*dm));
            out[i+1]=Math.round(255*(g*(1-dm)+clamp01(fc[1]*shade)*dm));
            out[i+2]=Math.round(255*(bl*(1-dm)+clamp01(fc[2]*shade)*dm));
            out[i+3]=255;
        }
    }
    ctx.putImageData(frame,0,0);
    if(window.avatarMagnifierFrame)window.avatarMagnifierFrame();
}
function showError(err){
    console.error('Four-character avatar website:',err);
    loadNode.classList.add('error');
    loadNode.textContent='角色无法加载，请检查图片是否完整，并使用 GitHub Pages HTTPS 地址打开。';
    canvas.style.display='none';
    const img=document.createElement('img');img.src=artPaths(activeCharacter)[0];img.alt='静态角色立绘';
    img.style.cssText='width:100%;height:100%;object-fit:cover';canvasFrame.appendChild(img);
    document.querySelectorAll('button').forEach(button=>{button.disabled=true;button.title='动画无法初始化';});
}
async function start(){
    try{
        gl=canvas.getContext('webgl2',{alpha:false,antialias:true}) ||
           canvas.getContext('webgl',{alpha:false,antialias:true});
        if(gl){
            const isWebgl2=(typeof WebGL2RenderingContext!=='undefined'&&gl instanceof WebGL2RenderingContext);
            program=makeProgram(gl,isWebgl2);gl.useProgram(program);
            const names=['art','motionA','motionB','motionC','pendantMask','waveTime',
                         'tailAnimation','hairAnimation','fabricAnimation',
                         'hairGain','hairLift','outfitColor','hairStrength','outfitStrength'];
            uniforms=Object.fromEntries(names.map(name=>[name,gl.getUniformLocation(program,name)]));
            ['art','motionA','motionB','motionC','pendantMask'].forEach((name,i)=>gl.uniform1i(uniforms[name],i));
            const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
            gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
            const pos=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(pos);
            gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
        }
        const images=await getImages('fox');
        if(gl){currentTextures=images.map((img,i)=>uploadTexture(gl,img,i));bindTextures(currentTextures);}
        else {twoD=buildCanvas2DSet(images);canvas.width=twoD.width;canvas.height=twoD.height;}
        started=true;loadNode.classList.add('hidden');
        requestAnimationFrame(gl?renderGL:draw2D);
    }catch(err){showError(err);}
}
canvas.addEventListener('webglcontextlost',e=>{
    e.preventDefault();started=false;
    loadNode.textContent='绘图设备暂时不可用，正在等待恢复…';loadNode.classList.remove('hidden');
});
canvas.addEventListener('webglcontextrestored',()=>location.reload());
start();
