
(function(){
'use strict';
let active=null,chap=0,chapters=[],detail={},current=null,destination='';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=s=>{s=String(s||'');return s&&!/^(?:javascript:|data:|https?:|\/)/i.test(s)&&!s.includes('..')?esc(s):''};
const types=s=>(s.types||[]).map(x=>'<span>'+esc(x)+'</span>').join('');
const chapter=(name,html)=>({name,html});
function showChapter(){
  const a=chapters[chap]||chapters[0],b=chapters[chap+1]||null;
  active.querySelector('.page.left').innerHTML=a.html;
  active.querySelector('.page.right').innerHTML=b?b.html:'<h2>故事未完待續 ✦</h2><p>點擊下方「完整劇本介紹」繼續探索。</p>';
  active.querySelector('.prev').disabled=chap===0;
  active.querySelector('.next').disabled=chap>=chapters.length-2;
}
function close(){
  if(!active)return;
  active.remove();active=null;document.body.style.overflow='';
}
function makeChapters(s,d){
 const tagline=d.tagline||'翻開這一頁，走進另一個世界。';
 const characters=(d.characters||s.characters||[]).map(c=>typeof c==='string'?{name:c}:c);
 const charHtml=characters.map(c=>'<div class="char">'+(safe(c.image)?'<img src="'+safe(c.image)+'" alt="'+esc(c.name)+'">':'<div class="placeholder">✦</div>')+'<div>'+esc(c.name)+'</div></div>').join('');
 const story=esc(d.story||'更多故事內容，請進入完整劇本介紹。');
 const features=esc(d.features||'精彩故事，等待探索。');
 const notice=esc(d.notice||'');
 return [
 chapter('扉頁','<div class="chapter">THE STORY BEGINS</div><h2>'+esc(s.name)+'</h2><p>'+esc(tagline)+'</p><div class="story-tags">'+types(s)+'</div><p>👥 '+esc(s.playersLabel||s.players+'人')+'<br>⌛ '+esc(s.timeLabel||s.time+'小時')+'</p>'),
 chapter('故事簡介','<div class="chapter">CHAPTER I</div><h3>故事簡介</h3><p>'+story+'</p>'),
 chapter('遊戲特色','<div class="chapter">CHAPTER II</div><h3>遊戲特色</h3><p>'+features+'</p>'),
 chapter('角色介紹','<div class="chapter">CHAPTER III</div><h3>角色介紹</h3><div class="char-grid">'+charHtml+'</div>'),
 chapter('行前須知','<div class="chapter">CHAPTER IV</div><h3>行前須知</h3><p>'+notice+'</p>')
 ];
}
window.playStorybookTransition=async function(s,url){
 if(active)return;
 current=s;destination=url;chap=0;document.body.style.overflow='hidden';
 const el=document.createElement('div');el.id='storybook';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','魔法圖書館劇本介紹');
 active=el;
 const poster=safe(s.poster);
 el.innerHTML='<div class="library-art"></div><div class="dust"></div><div class="library-label">✦ 敏捷私團 · STORYLAB ✦</div>'+
 '<div class="library-shelf"></div><div class="magic-book"><div class="book-block"><div class="book-pages"><div class="book-inside"><strong>'+esc(s.name)+'</strong><span>✧ 故事，即將展開 ✧</span></div></div><div class="book-cover">'+(poster?'<img src="'+poster+'" alt="'+esc(s.name)+' 海報">':'<div class="no-poster">'+esc(s.name)+'</div>')+'</div></div><div class="reading"><div class="page left"></div><div class="page right"></div><div class="page-turn"></div><div class="book-actions"><button class="prev" type="button">← 上一頁</button><button class="next" type="button">下一頁 →</button></div></div></div>'+
 '<div class="hint">✦ 魔法書正在從書架取出 ✦</div><button class="close" type="button">✕ 返回總覽</button>';
 document.body.appendChild(el);
 el.querySelector('.close').onclick=close;
 el.querySelector('.prev').onclick=()=>turn(-1);
 el.querySelector('.next').onclick=()=>turn(1);
 const escListener=e=>{if(e.key==='Escape'){close();document.removeEventListener('keydown',escListener)}};
 document.addEventListener('keydown',escListener);
 let d={};
 try{const r=await fetch('script-details.json',{cache:'no-cache'});if(r.ok){const all=await r.json();d=all[s.id]||{}}}catch(e){}
 if(active!==el)return;
 detail=d;chapters=makeChapters(s,d);showChapter();
 const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 setTimeout(()=>{if(active!==el)return;el.classList.add('open');el.querySelector('.hint').textContent='✦ 翻閱魔法書，探索劇本故事 ✦'},reduced?100:2600);
};
function turn(dir){
 if(!active||active.classList.contains('turning'))return;
 const next=chap+dir*2;
 if(next<0||next>=chapters.length)return;
 active.classList.add('turning');
 setTimeout(()=>{if(!active)return;chap=next;showChapter()},310);
 setTimeout(()=>{if(active)active.classList.remove('turning')},660);
}
})();
