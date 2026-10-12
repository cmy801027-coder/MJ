(() => {
'use strict';
const root=document.getElementById('main');
const params=new URLSearchParams(location.search);
const id=params.get('id');
const scripts=Array.isArray(window.SCRIPTS)?window.SCRIPTS:[];
const item=scripts.find(s=>s.id===id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const attr=esc;
const safePath=x=>{const s=String(x||'');return !s||/^(?:javascript:|data:|https?:)/i.test(s)||s.startsWith('/')||s.includes('..')?'':s};
const section=(num,en,title,body)=>body?`<section class="section reveal"><div class="heading"><span class="eyebrow">${num} / ${en}</span><h2>${title}</h2></div>${body}</section>`:'';
const paragraph=x=>`<div class="prose">${esc(x)}</div>`;
const youtubeId=x=>{const s=String(x||'').trim();if(/^[\w-]{11}$/.test(s))return s;const m=s.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);return m?m[1]:null};
if(!item){root.innerHTML='<section class="section"><h1>找不到這本劇本</h1><p>請從劇本總覽選擇。</p><a class="button" href="index.html">返回總覽</a></section>';return}
document.title=item.name+'｜MJ LARP';
fetch('script-details.json',{cache:'no-cache'}).then(r=>r.ok?r.json():{}).catch(()=>({})).then(all=>{
const d=all[id]||{};
const tags=(item.types||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join('');
const poster=safePath(d.poster||item.poster);
const chars=(d.characters||item.characters||[]).map(c=>{
const name=typeof c==='string'?c:c.name;
const image=typeof c==='string'?'':safePath(c.image);
const subtitle=typeof c==='string'?'':c.subtitle;
return `<div class="char">${image?`<img loading="lazy" src="${attr(image)}" alt="${attr(name)}">`:'<div style="aspect-ratio:3/4;background:#17172d"></div>'}<strong>${esc(name)}</strong><small>${esc(subtitle)}</small></div>`}).join('');
const video=youtubeId(d.youtube||item.youtube);
root.innerHTML=`<section class="hero reveal"><div>${poster?`<img class="poster" src="${attr(poster)}" alt="${attr(item.name)}海報">`:''}</div><div><div class="eyebrow">SCRIPT ARCHIVE / ${esc(item.id)}</div><h1>${esc(item.name)}</h1><p class="tagline">${esc(d.tagline||'')}</p><div class="stats"><div class="stat"><small>PLAYERS / 人數</small><span>${esc(item.players)}人 · ${esc(item.playersLabel)}</span></div><div class="stat"><small>DURATION / 時長</small><span>${esc(item.timeLabel||item.time+'小時')}</span></div><div class="stat"><small>GENRE / 類型</small><span>${esc((item.types||[]).slice(0,3).join(' · '))}</span></div></div><div class="tags">${tags}</div></div></section>`+
section('01','THE STORY','劇本簡介',d.story?paragraph(d.story):'<p class="empty">詳細劇情介紹整理中。</p>')+
section('02','THE CAST','角色列表',chars?`<div class="cards">${chars}</div>`:'')+
section('03','BEFORE YOU GO','行前須知',d.notice?`<div class="prose notice">${esc(d.notice)}</div>`:'')+
section('04','FEATURES','遊戲特色',d.features?paragraph(d.features):'')+
section('05','HOSTS','主持人名冊',Array.isArray(d.hosts)&&d.hosts.length?`<div class="cards">${d.hosts.map(h=>`<div class="char">${safePath(h.image)?`<img loading="lazy" src="${attr(safePath(h.image))}" alt="${attr(h.name)}">`:''}<strong>${esc(h.name)}</strong><small>${esc(h.subtitle||'')}</small></div>`).join('')}</div>`:'')+
section('06','VIDEO','介紹影片',video?`<iframe class="video" id="video" loading="lazy" src="https://www.youtube-nocookie.com/embed/${video}" title="劇本介紹影片" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`:'')+
section('07','BOOKING','預約體驗',`<div class="prose">${d.bookingNote?esc(d.bookingNote):'歡迎洽詢預約。'}<p><a class="button" href="index.html">返回劇本總覽 ↗</a></p></div>`);
const els=root.querySelectorAll('.reveal');if('IntersectionObserver' in window){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target)}}),{threshold:.05});els.forEach(e=>io.observe(e))}else els.forEach(e=>e.classList.add('visible'));
if(location.hash==='#video')document.getElementById('video')?.scrollIntoView();
});
})();