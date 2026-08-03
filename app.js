const C = window.QUIZ_CONFIG;
const L = window.LIFF_CONFIG || { gameLiffId: 'YOUR_GAME_LIFF_ID', shareLiffId: 'YOUR_SHARE_LIFF_ID', hosts: [] };
const app = document.querySelector('#app');
const musicBtn = document.querySelector('#musicBtn');
let state = { page:'start', route:null, index:0, scores:[0,0,0], answers:[], muted:false, note:'' };
let audio = null;
let transitionLocked = false;
let liffReady = false;
let liffError = '';

const sleep = ms => new Promise(r => setTimeout(r, ms));
function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

async function initLiff(){
  if (!window.liff) { liffError = 'LIFF SDK 載入失敗'; return; }
  if (!L.gameLiffId || L.gameLiffId === 'YOUR_GAME_LIFF_ID') {
    // 即使尚未設定遊戲 LIFF ID，測驗仍可在一般瀏覽器遊玩。
    liffError = '尚未設定遊戲 LIFF ID';
    return;
  }
  try {
    await liff.init({ liffId: L.gameLiffId });
    liffReady = true;
  } catch (error) {
    console.error(error);
    liffError = error?.message || '遊戲 LIFF 初始化失敗';
  }
}
initLiff();

function initAudio(){
  if(audio) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if(!AC) return;
  const ctx = new AC();
  const master = ctx.createGain(); master.gain.value = .045; master.connect(ctx.destination);
  const filter = ctx.createBiquadFilter(); filter.type='lowpass'; filter.frequency.value=520; filter.connect(master);
  const osc1=ctx.createOscillator(), osc2=ctx.createOscillator();
  const g1=ctx.createGain(), g2=ctx.createGain();
  osc1.type='sine'; osc1.frequency.value=55; g1.gain.value=.55;
  osc2.type='triangle'; osc2.frequency.value=82.4; g2.gain.value=.12;
  osc1.connect(g1).connect(filter); osc2.connect(g2).connect(filter); osc1.start(); osc2.start();
  const lfo=ctx.createOscillator(), lfoGain=ctx.createGain(); lfo.frequency.value=.08; lfoGain.gain.value=180; lfo.connect(lfoGain).connect(filter.frequency); lfo.start();
  audio={ctx,master};
  musicBtn.textContent='SOUND ON';
}
function toggleAudio(){
  if(!audio){initAudio();return;}
  state.muted=!state.muted;
  audio.master.gain.setTargetAtTime(state.muted?0:.045,audio.ctx.currentTime,.35);
  musicBtn.textContent=state.muted?'SOUND OFF':'SOUND ON';
}

async function cinematic(items, nextPage){
  if(transitionLocked) return; transitionLocked=true;
  app.innerHTML='<section class="cinema-stage"></section>';
  const stage=app.firstElementChild;
  for(const item of items){
    stage.classList.remove('visible'); await sleep(500);
    stage.innerHTML=`${item.chapter?`<div class="chapter">${item.chapter}</div>`:''}<div class="story-lines">${item.lines.map(x=>`<p>${escapeHtml(x)}</p>`).join('')}</div><div class="continue-hint">點擊畫面繼續</div>`;
    requestAnimationFrame(()=>stage.classList.add('visible'));
    await waitForAdvance(stage,item.hold||900);
  }
  stage.classList.remove('visible'); await sleep(650);
  transitionLocked=false; state.page=nextPage; render();
}
function waitForAdvance(el,minHold){
  return new Promise(resolve=>{
    let ready=false,done=false;
    const finish=()=>{if(!ready||done)return;done=true;el.removeEventListener('click',finish);resolve();};
    el.addEventListener('click',finish); setTimeout(()=>{ready=true;el.classList.add('can-continue');},minHold);
  });
}

function getResult(){
  const chars=C.characters[state.route], max=Math.max(...state.scores,1);
  const ranking=chars.map((x,i)=>({...x,score:state.scores[i],pct:Math.round(state.scores[i]/max*100)})).sort((a,b)=>b.score-a.score);
  return { ranking, top: ranking[0] };
}

function render(){
  app.innerHTML=''; const p=document.createElement('section'); p.className='panel';
  if(state.page==='start') p.innerHTML=`<div class="eyebrow">${C.subtitle}</div><h1 class="title">${C.title}</h1><div class="opening-quote">${C.opening.quote.map(x=>`<p>${x}</p>`).join('')}</div><button class="btn" id="startBtn">${C.opening.button}</button>`;
  if(state.page==='route') p.innerHTML=`<div class="eyebrow">SELECT YOUR VIEW</div><h2 class="section-title">你要透過誰的眼睛，走進故事？</h2><div class="routes"><button class="route" data-route="male"><small>MALE ROUTE</small><h3>男角路線</h3><p>${C.characters.male.map(x=>x.name).join('<br>')}</p></button><button class="route" data-route="female"><small>FEMALE ROUTE</small><h3>女角路線</h3><p>${C.characters.female.map(x=>x.name).join('<br>')}</p></button></div>`;
  if(state.page==='quiz'){
    const q=C.questions[state.index];
    p.innerHTML=`<div class="question"><div class="qnum">QUESTION ${String(state.index+1).padStart(2,'0')} / ${String(C.questions.length).padStart(2,'0')}</div><p class="scene-text">${escapeHtml(q.scene)}</p><h2>${escapeHtml(q.q)}</h2><div class="answers">${q.a.map((a,i)=>`<button class="answer" data-answer="${i}"><span>${String(i+1).padStart(2,'0')}</span><span>${escapeHtml(a[0])}</span></button>`).join('')}</div><div class="progress"><i style="width:${(state.index+1)/C.questions.length*100}%"></i></div></div>`;
  }
  if(state.page==='result'){
    const { ranking:rank, top }=getResult();
    p.innerHTML=`<div class="eyebrow">YOUR SOUL CHARACTER</div><div class="result-card"><img src="${top.image}" alt="${top.name}"><div class="result-name"><h1>${top.name}</h1><p>${top.kr}</p></div></div><p class="desc">${top.desc}</p><div class="eyebrow resonance-title">靈魂共鳴度 RESONANCE</div><div class="rank">${rank.map(r=>`<div class="rank-row"><span>${r.name}</span><div class="bar"><i style="width:${r.pct}%"></i></div><b>${r.pct}%</b></div>`).join('')}</div><div class="note"><textarea id="note" placeholder="寫下你對角色的期待、雷點，或想告訴主持人的話…">${escapeHtml(state.note||'')}</textarea></div><div class="actions"><button class="btn" id="goShare">傳送給主持人</button><button class="ghost" id="restart">重新測驗</button></div><p class="share-status" id="shareStatus">姓名、日期與主持人會在下一頁才填寫。</p>`;
  }
  app.appendChild(p); bind();
}


function buildSharePayload(){
  const { ranking, top } = getResult();
  return {
    title: C.title,
    route: state.route,
    routeName: state.route === 'male' ? '男角路線' : '女角路線',
    top,
    ranking,
    answers: state.answers,
    note: (document.querySelector('#note')?.value || state.note || '').trim(),
    savedAt: new Date().toISOString()
  };
}

function goToShareLiff(){
  const status = document.querySelector('#shareStatus');
  state.note = document.querySelector('#note')?.value || '';
  localStorage.setItem('plastikQuizShareResult', JSON.stringify(buildSharePayload()));

  if (!L.shareLiffId || L.shareLiffId === 'YOUR_SHARE_LIFF_ID') {
    status.textContent = '尚未設定分享 LIFF ID，請先修改 liff-config.js。';
    return;
  }
  window.location.href = `https://liff.line.me/${encodeURIComponent(L.shareLiffId)}`;
}

function bind(){
  document.querySelector('#startBtn')?.addEventListener('click',()=>{initAudio();cinematic(C.prologue,'route');});
  document.querySelectorAll('[data-route]').forEach(b=>b.addEventListener('click',()=>{state.route=b.dataset.route;state.index=0;state.scores=[0,0,0];state.answers=[];cinematic([C.interludes[0]],'quiz');}));
  document.querySelectorAll('[data-answer]').forEach(b=>b.addEventListener('click',()=>{
    const answerIndex=Number(b.dataset.answer);
    const score=C.questions[state.index].a[answerIndex][1];
    state.answers.push({questionIndex:state.index,answerIndex,question:C.questions[state.index].q,answer:C.questions[state.index].a[answerIndex][0]});
    state.scores=state.scores.map((v,i)=>v+score[i]); state.index++;
    if(state.index>=C.questions.length){cinematic([{chapter:'EPILOGUE',lines:['所有答案都已沉入玻璃底下。','現在，看看誰在另一端凝視你。'],hold:1200}],'result');}
    else cinematic([C.interludes[state.index]],'quiz');
  }));
  document.querySelector('#restart')?.addEventListener('click',()=>{state={page:'start',route:null,index:0,scores:[0,0,0],answers:[],muted:state.muted,note:''};render();});
  document.querySelector('#goShare')?.addEventListener('click',goToShareLiff);
}

musicBtn.addEventListener('click',toggleAudio); render();
