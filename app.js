'use strict';

const DATA = {};
const app = document.querySelector('#app');
const musicBtn = document.querySelector('#musicBtn');
let activeScriptId = null;
let state = {};
let audio = null;
let transitionLocked = false;
let liffReady = false;
let liffError = '';

const resetState = () => ({
  page: 'scriptSelect', route: null, index: 0, scores: [0,0,0],
  answers: [], muted: false, note: '', playerName: '', playDate: '',
  selectedHostId: ''
});
state = resetState();

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function getRequestedScriptId() {
  const queryId = new URLSearchParams(
    window.location.search
  ).get('script');

  if (queryId) {
    return queryId.trim();
  }

  const match = window.location.pathname.match(
    /\/play\/([^/?#]+)\/?$/
  );

  return match
    ? decodeURIComponent(match[1])
    : '';
}

function getScriptMeta(scriptId) {
  return (DATA.index?.scripts || []).find(
    item => item.id === scriptId
  ) || null;
}

function setScriptUrl(scriptId, replace = false) {
  const url =
    `/play/${encodeURIComponent(scriptId)}`;

  if (replace) {
    window.history.replaceState(
      { scriptId },
      '',
      url
    );
  } else {
    window.history.pushState(
      { scriptId },
      '',
      url
    );
  }
}

function showScriptNotFound(scriptId) {
  state.page = 'scriptSelect';

  app.innerHTML = `
    <section class="panel">
      <div class="eyebrow">STORY NOT FOUND</div>
      <h1 class="section-title">找不到這個劇本</h1>
      <p class="desc">
        入口 ID「${esc(scriptId)}」不存在、
        尚未發布，或已被刪除。
      </p>
      <button
        class="btn"
        id="showStoryList"
        type="button"
      >
        查看可用劇本
      </button>
    </section>
  `;

  document
    .querySelector('#showStoryList')
    ?.addEventListener('click', () => {
      window.history.replaceState(
        {},
        '',
        '/'
      );

      state.page = 'scriptSelect';
      render();
    });
}
const esc = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

async function loadJson(url) {
  const r = await fetch(url, {cache:'no-store'});
  if (!r.ok) throw new Error(`無法載入 ${url} (${r.status})`);
  return r.json();
}

async function loadGlobalData() {
  [DATA.index, DATA.global, DATA.hosts] = await Promise.all([
    loadJson('./data/index.json'), loadJson('./data/settings.json'), loadJson('./data/hosts.json')
  ]);
}

async function loadScript(id) {
  const base = `./data/scripts/${id}`;
  [DATA.setting, DATA.story, DATA.questions, DATA.characters] = await Promise.all([
    loadJson(`${base}/settings.json`), loadJson(`${base}/story.json`),
    loadJson(`${base}/questions.json`), loadJson(`${base}/characters.json`)
  ]);
  activeScriptId = id;
  document.title = `${DATA.setting.title || DATA.setting.name}｜角色測驗`;
}

async function initLiff() {
  if (!window.liff) { liffError='LIFF SDK 載入失敗'; return; }
  const id = DATA.global?.liffId;
  if (!id) { liffError='data/settings.json 未設定 liffId'; return; }
  try { await liff.init({liffId:id}); liffReady=true; }
  catch(e){ console.error(e); liffError=e?.message||'LIFF 初始化失敗'; }
}

function todayValue() {
  const d=new Date(); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
}

function initAudio() {
  const bgm = DATA.setting?.bgm;
  if (audio) {
    if (audio.tag) audio.tag.play().catch(()=>{});
    return;
  }
  if (bgm?.src) {
    const tag = new Audio(bgm.src);
    tag.loop = bgm.loop !== false;
    tag.volume = Number(bgm.volume ?? .35);
    tag.play().catch(()=>{});
    audio = {tag};
    musicBtn.textContent='SOUND ON';
    return;
  }
  const AC=window.AudioContext||window.webkitAudioContext;
  if (!AC) return;
  const context=new AC(), master=context.createGain(), osc=context.createOscillator();
  master.gain.value=Number(DATA.setting.audio?.volume ?? .045);
  master.connect(context.destination); osc.frequency.value=55; osc.connect(master); osc.start();
  audio={context,master}; musicBtn.textContent='SOUND ON';
}

function toggleAudio(){
  if(!audio){initAudio();return}
  state.muted=!state.muted;
  if(audio.tag){audio.tag.muted=state.muted}
  else audio.master.gain.setTargetAtTime(state.muted?0:Number(DATA.setting.audio?.volume??.045),audio.context.currentTime,.3);
  musicBtn.textContent=state.muted?'SOUND OFF':'SOUND ON';
}

function waitForAdvance(el, hold){
  return new Promise(resolve=>{
    let ready=false,done=false;
    const finish=()=>{if(!ready||done)return;done=true;el.removeEventListener('click',finish);resolve()};
    el.addEventListener('click',finish);
    setTimeout(()=>{ready=true;el.classList.add('can-continue')},hold);
  });
}

async function cinematic(items,next){
  if(transitionLocked)return; transitionLocked=true;
  app.innerHTML='<section class="cinema-stage"></section>'; const stage=app.firstElementChild;
  for(const item of items||[]){
    stage.classList.remove('visible'); await sleep(350);
    stage.innerHTML=`${item.chapter?`<div class="chapter">${esc(item.chapter)}</div>`:''}
      <div class="story-lines">${(item.lines||[]).map(x=>`<p>${esc(x)}</p>`).join('')}</div>
      <div class="continue-hint">點擊畫面繼續</div>`;
    requestAnimationFrame(()=>stage.classList.add('visible'));
    await waitForAdvance(stage, Number(item.hold||item.duration||900));
  }
  stage.classList.remove('visible'); await sleep(500); transitionLocked=false; state.page=next; render();
}

function chars(){return DATA.characters?.[state.route]||[]}
function result(){
  const max=Math.max(...state.scores,1);
  const ranking=chars().map((c,i)=>({...c,score:state.scores[i]||0,pct:Math.round((state.scores[i]||0)/max*100)})).sort((a,b)=>b.score-a.score);
  return {ranking,top:ranking[0]};
}
function selectedHost(){return (DATA.hosts||[]).find(h=>h.id===state.selectedHostId)}

function renderScriptSelect(p){
  p.innerHTML=`<div class="eyebrow">SELECT STORY</div><h1 class="title">${esc(DATA.global.siteTitle||'Assign Roles')}</h1>
  <div class="script-list">${(DATA.index.scripts||[]).filter(s=>s.status!=='draft').map(s=>`
    <button class="script-card" data-script="${esc(s.id)}"><small>STORY</small><h3>${esc(s.name)}</h3><span>進入故事</span></button>`).join('')}</div>`;
}
function renderStart(p){
  p.innerHTML=`<div class="eyebrow">${esc(DATA.setting.subtitle)}</div><h1 class="title">${esc(DATA.setting.title||DATA.setting.name)}</h1>
  <div class="opening-quote">${DATA.story.opening.quote.map(x=>`<p>${esc(x)}</p>`).join('')}</div>
  <button class="btn" id="startBtn">${esc(DATA.story.opening.button||'開始')}</button>`;
}
function renderRoute(p){
  const r=DATA.setting.routeSelection;
  p.innerHTML=`<div class="eyebrow">SELECT YOUR VIEW</div><h2 class="section-title">${esc(r.title)}</h2><div class="routes">
  <button class="route" data-route="male"><small>${esc(r.maleEyebrow)}</small><h3>${esc(r.maleLabel)}</h3><p>${DATA.characters.male.map(c=>esc(c.name)).join('<br>')}</p></button>
  <button class="route" data-route="female"><small>${esc(r.femaleEyebrow)}</small><h3>${esc(r.femaleLabel)}</h3><p>${DATA.characters.female.map(c=>esc(c.name)).join('<br>')}</p></button></div>`;
}
function renderQuiz(p){
  const q=DATA.questions[state.index];
  p.innerHTML=`<div class="question"><div class="qnum">QUESTION ${String(state.index+1).padStart(2,'0')} / ${String(DATA.questions.length).padStart(2,'0')}</div>
  <p class="scene-text">${esc(q.scene)}</p><h2>${esc(q.question)}</h2><div class="answers">${q.answers.map((a,i)=>`
  <button class="answer" data-answer="${i}"><span>${String(i+1).padStart(2,'0')}</span><span>${esc(a.text)}</span></button>`).join('')}</div>
  <div class="progress"><i style="width:${(state.index+1)/DATA.questions.length*100}%"></i></div></div>`;
}
function renderResult(p){
  const {ranking,top}=result(), s=DATA.setting.result;
  p.innerHTML=`<div class="eyebrow">${esc(s.eyebrow)}</div><div class="result-card"><img src="${esc(top.image)}" alt="${esc(top.name)}">
  <div class="result-name"><h1>${esc(top.name)}</h1><p>${esc(top.kr||'')}</p></div></div><p class="desc">${esc(top.description||top.desc||'')}</p>
  <div class="eyebrow resonance-title">${esc(s.resonanceLabel)}</div><div class="rank">${ranking.map(c=>`<div class="rank-row"><span>${esc(c.name)}</span><div class="bar"><i style="width:${c.pct}%"></i></div><b>${c.pct}%</b></div>`).join('')}</div>
  <div class="note"><textarea id="note" placeholder="${esc(s.notePlaceholder)}">${esc(state.note)}</textarea></div><div class="actions">
  <button class="btn" id="goShare">${esc(s.shareButton)}</button><button class="ghost" id="restart">${esc(s.restartButton)}</button></div>`;
  if(top.music) new Audio(top.music).play().catch(()=>{});
}
function renderShare(p){
  const {top}=result(), s=DATA.setting.share; if(!state.playDate)state.playDate=todayValue(); p.classList.add('share-panel');
  p.innerHTML=`<div class="eyebrow">${esc(s.eyebrow)}</div><h2 class="section-title">${esc(s.title)}</h2>
  <div class="share-result-mini"><img src="${esc(top.image)}"><div><small>你的結果</small><strong>${esc(top.name)}</strong><span>${top.pct}% 共鳴</span></div></div>
  <div class="fields"><div class="field"><label>${esc(s.playerNameLabel)}</label><input id="playerName" value="${esc(state.playerName)}"></div>
  <div class="field"><label>${esc(s.dateLabel)}</label><input id="playDate" type="date" value="${esc(state.playDate)}"></div></div>
  <div class="eyebrow host-heading">${esc(s.hostLabel)}</div><div class="host-grid">${DATA.hosts.map(h=>`<label class="host-card"><input type="radio" name="host" value="${esc(h.id)}" ${h.id===state.selectedHostId?'checked':''}><strong>${esc(h.displayName||h.name)}</strong><span>${esc(h.note||'')}</span></label>`).join('')}</div>
  <div class="actions"><button class="btn" id="sendToLine">${esc(s.button)}</button><button class="ghost" id="backToResult">${esc(s.backButton)}</button></div>
  <p class="share-status" id="shareStatus">按下按鈕後才會開啟 LINE 分享視窗。</p>`;
}
function renderSuccess(p){p.innerHTML=`<div class="eyebrow">MESSAGE DELIVERED</div><h2 class="section-title">分享流程已完成</h2><p class="desc">請確認訊息已送到正確的主持人聊天室。</p><div class="actions"><button class="btn" id="shareAgain">再次分享</button><button class="ghost" id="restart">重新測驗</button></div>`}

function render(){
  app.innerHTML=''; const p=document.createElement('section');p.className='panel';
  ({scriptSelect:renderScriptSelect,start:renderStart,route:renderRoute,quiz:renderQuiz,result:renderResult,share:renderShare,success:renderSuccess}[state.page]||renderScriptSelect)(p);
  app.appendChild(p); bind();
}

function answer(i){
  const q=DATA.questions[state.index],a=q.answers[i];
  state.scores=state.scores.map((x,j)=>x+Number(a.score[j]||0));state.index++;
  if(state.index>=DATA.questions.length)cinematic(DATA.story.epilogue,'result');
  else cinematic([DATA.story.interludes[state.index]||{}],'quiz');
}
function saveForm(){state.playerName=document.querySelector('#playerName')?.value.trim()||'';state.playDate=document.querySelector('#playDate')?.value||'';state.selectedHostId=document.querySelector('input[name=host]:checked')?.value||state.selectedHostId}
function status(t){const e=document.querySelector('#shareStatus');if(e)e.textContent=t}
function shareMessage(){
  const {ranking,top}=result(),h=selectedHost();
  return [`【${DATA.setting.title}｜角色測驗結果】`,'',`指定主持人：${h?.displayName||h?.name||'未指定'}`,`玩家：${state.playerName}`,`遊玩日期：${state.playDate}`,`結果角色：${top.name}`,`最高共鳴度：${top.pct}%`,'','角色共鳴排行：',...ranking.map((c,i)=>`${i+1}. ${c.name} ${c.pct}%`),'','玩家留言：',state.note.trim()||'無'].join('\n');
}
async function send(){
  saveForm(); if(!state.playerName){status('請填寫玩家姓名');return} if(!state.playDate){status('請選擇日期');return} if(!selectedHost()){status('請選擇主持人');return}
  if(!liffReady){await initLiff();if(!liffReady){status(`LINE 初始化失敗：${liffError}`);return}}
  if(!liff.isLoggedIn()){liff.login({redirectUri:location.href});return}
  if(!liff.isApiAvailable('shareTargetPicker')){status('請從 LINE App 開啟');return}
  try{const r=await liff.shareTargetPicker([{type:'text',text:shareMessage()}],{isMultiple:false});if(r){state.page='success';render()}else status('已取消分享')}
  catch(e){status(`分享失敗：${e?.message||'未知錯誤'}`)}
}
function restart() {
  const muted = state.muted;
  const currentScriptId = activeScriptId;

  state = resetState();
  state.muted = muted;

  if (currentScriptId) {
    state.page = 'start';
  }

  render();
}

function bind(){
  document.querySelectorAll('[data-script]').forEach(button => {
    button.onclick = async () => {
      const scriptId = button.dataset.script;

      await loadScript(scriptId);
      setScriptUrl(scriptId);
      state.page = 'start';
      render();
    };
  });
  document.querySelector('#startBtn')?.addEventListener('click',()=>{initAudio();cinematic(DATA.story.prologue,'route')});
  document.querySelectorAll('[data-route]').forEach(b=>b.onclick=()=>{state.route=b.dataset.route;state.index=0;state.scores=[0,0,0];cinematic([DATA.story.interludes[0]||{}],'quiz')});
  document.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>answer(Number(b.dataset.answer)));
  document.querySelector('#goShare')?.addEventListener('click',()=>{state.note=document.querySelector('#note')?.value||'';state.page='share';render()});
  document.querySelector('#sendToLine')?.addEventListener('click',send);
  document.querySelector('#backToResult')?.addEventListener('click',()=>{saveForm();state.page='result';render()});
  document.querySelector('#shareAgain')?.addEventListener('click',()=>{state.page='share';render()});
  document.querySelector('#restart')?.addEventListener('click',restart);
}
async function boot() {
  try {
    await loadGlobalData();

    const requestedScriptId =
      getRequestedScriptId();

    if (requestedScriptId) {
      const meta =
        getScriptMeta(requestedScriptId);

      if (
        !meta ||
        meta.status === 'draft'
      ) {
        showScriptNotFound(
          requestedScriptId
        );

        initLiff();
        return;
      }

      await loadScript(
        requestedScriptId
      );

      /*
       * 支援舊式網址：
       * /?script=plastic-greenhouse
       *
       * 載入後自動轉成乾淨入口：
       * /play/plastic-greenhouse
       */
      setScriptUrl(
        requestedScriptId,
        true
      );

      state.page = 'start';
      render();
      initLiff();
      return;
    }

    state.page = 'scriptSelect';
    render();
    initLiff();
  } catch (error) {
    console.error(error);

    app.innerHTML = `
      <section class="panel">
        <div class="eyebrow">LOAD ERROR</div>
        <h1 class="section-title">資料載入失敗</h1>
        <p class="desc">${esc(error.message)}</p>
      </section>
    `;
  }
}

window.addEventListener(
  'popstate',
  () => {
    window.location.reload();
  }
);
musicBtn.addEventListener('click',toggleAudio);boot();
