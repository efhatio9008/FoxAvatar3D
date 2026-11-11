'use strict';
// V0.7.1: CSS paints the flakes; JavaScript controls fall speed and emission rate.
// This layer is always behind the site and never intercepts pointer events.
(() => {
    const layer=document.getElementById('siteSnow');
    if(!layer || window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const mobile=window.matchMedia('(max-width: 725px)').matches;
    const emitEvery=mobile?145:110; // medium-high frequency, somewhat lighter on phones
    const maxActive=mobile?65:95;
    const rand=(min,max)=>min+Math.random()*(max-min);
    function flake(age=0){
        if(layer.childElementCount>=maxActive)return;
        const node=document.createElement('span');
        node.className='snowflake';
        const lifetime=rand(6.8,9.5); // medium-high falling speed
        const alpha=rand(.18,.49);
        node.style.setProperty('--snow-left',rand(0,100).toFixed(2)+'%');
        node.style.setProperty('--snow-size',rand(1.5,5.3).toFixed(2)+'px');
        node.style.setProperty('--snow-alpha',alpha.toFixed(2));
        node.style.setProperty('--snow-drift',rand(-78,78).toFixed(0)+'px');
        node.style.setProperty('--fall-time',lifetime.toFixed(2)+'s');
        node.style.setProperty('--fall-delay',(-Math.min(age,lifetime-.01)).toFixed(2)+'s');
        node.addEventListener('animationend',()=>node.remove(),{once:true});
        layer.appendChild(node);
    }
    // Start with snow already falling rather than a blank screen for the first seconds.
    const initial=mobile?34:55;
    for(let i=0;i<initial;i++)flake(rand(0,8));
    window.setInterval(()=>{if(!document.hidden)flake();},emitEvery);
})();
