// Crystal Beast: one true 3D glTF/GLB viewer inside the existing five-character portrait frame.
// Libraries load on demand; the four original 2.5D avatars stay independent.
const stage=document.getElementById('monsterStage');
const notice=document.getElementById('monsterStatus');
const panelStatus=document.getElementById('monsterPanelStatus');
const actionName=document.getElementById('monsterActionName');
const pauseButton=document.getElementById('monsterPause');
const motionButtons={afraid:document.getElementById('monsterAfraid'),box_01:document.getElementById('monsterBox')};
const resetButton=document.getElementById('monsterReset');
let ready=false,visible=false,loading=null,THREE=null,renderer=null,scene=null,camera=null,controls=null,mixer=null,model=null;
let currentMotion='box_01',paused=false,actions={},frameHandle=0,lastTime=0;
let initialCamera=null,initialTarget=null;

function message(text,error=false){
    notice.textContent=text;
    notice.classList.toggle('error',error);
    notice.classList.toggle('ready',!text);
    panelStatus.textContent=error?'3D 模型加载失败':text||'3D 已就绪 · 可自由旋转';
}
function setButtonsEnabled(on){
    Object.values(motionButtons).forEach(b=>b.disabled=!on);
    pauseButton.disabled=!on;
    resetButton.disabled=!on;
}
function syncMotionButtons(){
    Object.entries(motionButtons).forEach(([name,button])=>button.setAttribute('aria-pressed',String(name===currentMotion)));
    actionName.textContent=currentMotion==='afraid'?'害怕 · afraid':'拳击 · box_01';
    pauseButton.querySelector('span').textContent=paused?'▶ 继续动画':'⏸ 暂停动画';
}
function play(name){
    if(!ready || !actions[name])return;
    if(currentMotion!==name){
        const previous=actions[currentMotion];
        if(previous)previous.fadeOut(.16);
        actions[name].reset().fadeIn(.16).play();
        currentMotion=name;
    }else{
        actions[name].reset().play();
    }
    paused=false;
    if(mixer)mixer.timeScale=1;
    syncMotionButtons();
    panelStatus.textContent='正在播放：'+(name==='afraid'?'害怕 · afraid':'拳击 · box_01');
}
function pause(){
    if(!ready)return;
    paused=!paused;
    mixer.timeScale=paused?0:1;
    syncMotionButtons();
    panelStatus.textContent=paused?'动画已暂停 · 可以继续旋转模型':'动画播放中';
}
function reset(){
    if(!ready || !initialCamera)return;
    camera.position.copy(initialCamera);
    controls.target.copy(initialTarget);
    controls.update();
}
function resize(){
    if(!ready || !renderer || !camera)return;
    const w=Math.max(1,stage.clientWidth),h=Math.max(1,stage.clientHeight);
    camera.aspect=w/h;
    camera.updateProjectionMatrix();
    renderer.setSize(w,h,false);
}
function frame(now){
    if(!visible || !ready)return;
    frameHandle=requestAnimationFrame(frame);
    const delta=Math.min(.05,Math.max(0,(now-lastTime)/1000||0));
    lastTime=now;
    if(!document.hidden){
        if(mixer)mixer.update(delta);
        controls.update();
        renderer.render(scene,camera);
    }
}
function startFrames(){
    if(!ready || !visible || frameHandle)return;
    lastTime=performance.now();
    resize();
    frameHandle=requestAnimationFrame(frame);
}
function stopFrames(){
    if(frameHandle)cancelAnimationFrame(frameHandle);
    frameHandle=0;
}
function hide(){visible=false;stopFrames();}
async function init(){
    if(ready)return;
    if(loading)return loading;
    // Retry safely after a failed network/GLB load instead of stacking WebGL canvases.
    if(controls){controls.dispose();controls=null;}
    if(renderer){renderer.dispose();renderer.domElement.remove();renderer=null;}
    ready=false;scene=null;camera=null;model=null;mixer=null;actions={};
    setButtonsEnabled(false);
    message('正在准备真正 3D 引擎…');
    loading=(async()=>{
        const [core,gltfAddon,orbitAddon]=await Promise.all([
            import('three'),
            import('three/addons/loaders/GLTFLoader.js'),
            import('three/addons/controls/OrbitControls.js')
        ]);
        THREE=core;
        scene=new THREE.Scene();
        camera=new THREE.PerspectiveCamera(36,1,.02,100);
        renderer=new THREE.WebGLRenderer({alpha:true,antialias:!matchMedia('(pointer:coarse)').matches,powerPreference:'default'});
        const isSmall=matchMedia('(max-width:725px), (pointer:coarse)').matches;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,isSmall?1.25:2));
        renderer.setClearColor(0x171327,0);
        renderer.outputColorSpace=THREE.SRGBColorSpace;
        renderer.toneMapping=THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure=1.05;
        renderer.domElement.setAttribute('aria-label','可自由旋转 360° 的紫晶兽 3D 动画模型');
        stage.appendChild(renderer.domElement);
        controls=new orbitAddon.OrbitControls(camera,renderer.domElement);
        controls.enableDamping=true;
        controls.dampingFactor=.07;
        controls.enablePan=false;
        controls.rotateSpeed=.8;
        controls.zoomSpeed=.8;
        controls.minPolarAngle=.08;
        controls.maxPolarAngle=Math.PI-.08;
        scene.add(new THREE.HemisphereLight(0xe9e0ff,0x46365d,1.4));
        const key=new THREE.DirectionalLight(0xf8efff,2.2);key.position.set(3,5,6);scene.add(key);
        const fill=new THREE.DirectionalLight(0x9787ed,1.0);fill.position.set(-4,2,-4);scene.add(fill);
        message('正在读取紫晶兽 GLB 模型、骨骼与两个动作…');
        const loader=new gltfAddon.GLTFLoader();
        const gltf=await new Promise((resolve,reject)=>loader.load('assets/crystal_monster_web.glb',resolve,
            progress=>{
                if(!visible)return;
                if(progress.total>0){
                    const pct=Math.round(progress.loaded/progress.total*100);
                    message('正在加载紫晶兽 3D 模型… '+pct+'%');
                }
            },reject));
        model=gltf.scene;
        scene.add(model);
        const bounds=new THREE.Box3().setFromObject(model);
        const center=bounds.getCenter(new THREE.Vector3());
        const size=bounds.getSize(new THREE.Vector3());
        const height=Math.max(size.y,.1);
        const distance=height*2.30;
        camera.position.set(center.x+distance*.48,center.y+height*.10,center.z+distance);
        camera.near=.01;
        camera.far=Math.max(10,distance*20);
        camera.updateProjectionMatrix();
        controls.target.copy(center);
        controls.minDistance=height*.8;
        controls.maxDistance=height*5.5;
        controls.update();
        initialCamera=camera.position.clone();
        initialTarget=controls.target.clone();
        mixer=new THREE.AnimationMixer(model);
        for(const clip of gltf.animations){
            const which=/afraid/i.test(clip.name)?'afraid':/box[_\s-]?01/i.test(clip.name)?'box_01':null;
            if(!which)continue;
            actions[which]=mixer.clipAction(clip);
            actions[which].setLoop(THREE.LoopRepeat,Infinity);
        }
        if(!actions.afraid || !actions.box_01)throw new Error('GLB 缺少 afraid 或 box_01 动画');
        ready=true;
        setButtonsEnabled(true);
        message('');
        currentMotion='afraid';
        play('box_01');
        resize();
        if(visible)startFrames();
    })().catch(err=>{
        console.error('Crystal Beast 3D failed to initialize:',err);
        message('3D 暂时无法加载。请通过 GitHub Pages HTTPS 打开，并确保网络及浏览器 WebGL 可用。\n前四位 2.5D 角色仍可正常切换。',true);
        setButtonsEnabled(false);
        throw err;
    }).finally(()=>{loading=null;});
    return loading;
}
function show(){
    visible=true;
    if(ready){message('');startFrames();return;}
    init().catch(()=>{});
}
Object.entries(motionButtons).forEach(([name,button])=>button.addEventListener('click',()=>play(name)));
pauseButton.addEventListener('click',pause);
resetButton.addEventListener('click',reset);
window.addEventListener('avatar:character',e=>{if(e.detail?.character==='monster')show();else hide();});
window.addEventListener('resize',resize);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&visible)lastTime=performance.now();});
setButtonsEnabled(false);
syncMotionButtons();
window.crystal3D={show,hide,play,pause,reset};
if(document.body.dataset.character==='monster')show();
