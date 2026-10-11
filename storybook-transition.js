
(function(){
'use strict';
let busy=false;
window.playStorybookTransition=function(script,destination){
  if(busy)return;
  if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches){location.href=destination;return;}
  busy=true;
  const el=document.createElement('div');
  el.id='sb-scene';el.setAttribute('role','dialog');el.setAttribute('aria-label','童話圖書館取書動畫');
  const escapeHtml=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const poster=String(script.poster||'');
  const safePoster=poster && !/^\s*(?:javascript:|data:)/i.test(poster) ? escapeHtml(poster) : '';
  const cover=safePoster?'<img src="'+safePoster+'" alt="'+escapeHtml(script.name)+' 海報">':'<div class="sb-noimage">'+escapeHtml(script.name)+'</div>';
  let spines='';
  const colors=['#5a425a','#2b5b62','#a05b59','#735c88','#547058','#a06c43','#56517b'];
  for(let i=0;i<15;i++){
    spines+='<div class="sb-spine" style="--h:'+(57+(i*17)%39)+'%;--c:'+colors[i%colors.length]+';--r:'+((i%5)-2)*1.8+'deg"></div>';
  }
  let sparks='';
  for(let i=0;i<24;i++){
    sparks+='<i class="sb-spark" style="--x:'+((i*37+11)%95)+'%;--y:'+((i*23+19)%84)+'%;--d:'+(1.4+(i%6)*.3)+'s"></i>';
  }
  el.innerHTML='<div class="sb-stars"></div><div class="sb-moon"></div><div class="sb-arch"></div><div class="sb-shelf">'+spines+'</div>'+sparks+
  '<div class="sb-heading">✦ 敏捷私團 · STORYLAB ✦</div>'+
  '<div class="sb-book"><div class="sb-pages"><strong>'+escapeHtml(script.name)+'</strong><small>故事，即將展開 ✧</small></div><div class="sb-cover">'+cover+'</div></div>'+
  '<div class="sb-hint" aria-live="polite">正在尋找你的故事…</div>'+
  '<button class="sb-skip" type="button">跳過動畫 ↗</button>';
  document.body.appendChild(el);
  const go=()=>{window.location.href=destination};
  el.querySelector('.sb-skip').addEventListener('click',go,{once:true});
  const timer=setTimeout(go,3400);
  window.addEventListener('pagehide',()=>clearTimeout(timer),{once:true});
  requestAnimationFrame(()=>el.classList.add('sb-on'));
};
})();
