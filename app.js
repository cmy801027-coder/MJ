const C = window.QUIZ_CONFIG;
const L = window.LIFF_CONFIG || { liffId: 'YOUR_LIFF_ID', hosts: [] };
const app = document.querySelector('#app');
const musicBtn = document.querySelector('#musicBtn');
let state = { page:'start', name:'', time:'', route:null, index:0, scores:[0,0,0], answers:[], muted:false, selectedHost:null };
let audio = null;
let transitionLocked = false;
let liffReady = false;
let liffError = '';

const sleep = ms => new Promise(r => setTimeout(r, ms));
function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

async function initLiff(){
  if (!window.liff) { liffError = 'LIFF SDK 載入失敗'; return; }
  if (!L.liffId || L.liffId === 'YOUR_LIFF_ID') { liffError = '尚未設定 LIFF ID'; return; }
  try {
    await liff.init({ liffId: L.liffId });
    liffReady = true;
    if (!liff.isLoggedIn()) {
      // 外部瀏覽器會進行 LINE Login，LIFF 瀏覽器通常已登入。
      liff.login({ redirectUri: window.location.href });
    }
  } catch (error) {
    console.error(error);
    liffError = error?.message || 'LIFF 初始化失敗';
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
  if(state.page==='info') p.innerHTML=`<div class="eyebrow">VISITOR RECORD</div><h2 class="section-title">留下你的名字</h2><div class="fields"><div class="field"><label>玩家姓名 PLAYER NAME</label><input id="name" value="${escapeHtml(state.name)}" placeholder="請輸入您的稱呼"></div><div class="field"><label>遊玩時間 PLAY TIME</label><input id="time" value="${escapeHtml(state.time)}" placeholder="例：2026/8/3 晚上"></div></div><button class="btn" id="infoNext">下一步</button>`;
  if(state.page==='route') p.innerHTML=`<div class="eyebrow">SELECT YOUR VIEW</div><h2 class="section-title">你要透過誰的眼睛，走進故事？</h2><div class="routes"><button class="route" data-route="male"><small>MALE ROUTE</small><h3>男角路線</h3><p>${C.characters.male.map(x=>x.name).join('<br>')}</p></button><button class="route" data-route="female"><small>FEMALE ROUTE</small><h3>女角路線</h3><p>${C.characters.female.map(x=>x.name).join('<br>')}</p></button></div>`;
  if(state.page==='quiz'){
    const q=C.questions[state.index];
    p.innerHTML=`<div class="question"><div class="qnum">QUESTION ${String(state.index+1).padStart(2,'0')} / ${String(C.questions.length).padStart(2,'0')}</div><p class="scene-text">${escapeHtml(q.scene)}</p><h2>${escapeHtml(q.q)}</h2><div class="answers">${q.a.map((a,i)=>`<button class="answer" data-answer="${i}"><span>${String(i+1).padStart(2,'0')}</span><span>${escapeHtml(a[0])}</span></button>`).join('')}</div><div class="progress"><i style="width:${(state.index+1)/C.questions.length*100}%"></i></div></div>`;
  }
  if(state.page==='result'){
    const { ranking:rank, top }=getResult();
    p.innerHTML=`<div class="eyebrow">YOUR SOUL CHARACTER</div><div class="result-card"><img src="${top.image}" alt="${top.name}"><div class="result-name"><h1>${top.name}</h1><p>${top.kr}</p></div></div><p class="desc">${top.desc}</p><div class="eyebrow resonance-title">靈魂共鳴度 RESONANCE</div><div class="rank">${rank.map(r=>`<div class="rank-row"><span>${r.name}</span><div class="bar"><i style="width:${r.pct}%"></i></div><b>${r.pct}%</b></div>`).join('')}</div><div class="note"><textarea id="note" placeholder="寫下你對角色的期待、雷點，或想告訴主持人的話…"></textarea></div><div class="actions"><button class="btn" id="chooseHost">交給主持人</button><button class="ghost" id="restart">重新測驗</button></div><p class="share-status" id="shareStatus">${liffError ? `LIFF：${escapeHtml(liffError)}` : '按下後選擇主持人，再由 LINE 選擇實際收件人。'}</p>`;
  }
  if(state.page==='hosts'){
    const hosts=L.hosts || [];
    p.innerHTML=`<div class="eyebrow">CHOOSE YOUR GUIDE</div><h2 class="section-title">將答案交給哪位引路人？</h2><p class="host-intro">先選主持人，下一步 LINE 會開啟好友與群組選擇器。請選擇同一位主持人送出。</p><div class="host-grid">${hosts.map(h=>`<button class="host-card" data-host="${escapeHtml(h.id)}"><strong>${escapeHtml(h.displayName||h.name)}</strong><span>${escapeHtml(h.note||'主持人')}</span></button>`).join('')}</div><button class="ghost" id="backResult">返回結果</button><p class="share-status" id="shareStatus"></p>`;
  }
  app.appendChild(p); bind();
}

async function shareToLine(host){
  const status=document.querySelector('#shareStatus');
  const { ranking, top }=getResult();
  const note=(document.querySelector('#note')?.value || state.note || '').trim();
  state.note=note;
  const routeName=state.route==='male'?'男角路線':'女角路線';
  const message=[
    `【${C.title}｜角色測驗結果】`,
    '',
    `指定主持人：${host.displayName || host.name}`,
    `玩家：${state.name || '未命名玩家'}`,
    `遊玩時間：${state.time || '未填寫'}`,
    `選擇路線：${routeName}`,
    `結果角色：${top.name}`,
    `最高共鳴度：${top.pct}%`,
    '',
    '角色共鳴排行：',
    ...ranking.map((r,i)=>`${i+1}. ${r.name} ${r.pct}%`),
    '',
    '玩家留言：',
    note || '無'
  ].join('\n');

  if(!liffReady){
    status.textContent=liffError || 'LIFF 尚未完成初始化，請確認 LIFF ID 與網址設定。';
    return;
  }
  if(!liff.isApiAvailable('shareTargetPicker')){
    status.textContent='目前環境不支援 LINE 分享對象選擇器，請改用 LINE App 開啟此 LIFF 網址。';
    return;
  }

  status.textContent='正在開啟 LINE 分享對象選擇器…';
  try{
    const result=await liff.shareTargetPicker([{ type:'text', text:message }], { isMultiple:false });
    if(result){
      status.textContent=`已送出。請確認剛才選擇的是「${host.displayName || host.name}」。`;
    }else{
      status.textContent='你取消了分享，結果尚未送出。';
    }
  }catch(error){
    console.error(error);
    status.textContent=`LINE 分享失敗：${error?.message || '未知錯誤'}`;
  }
}

function bind(){
  document.querySelector('#startBtn')?.addEventListener('click',()=>{initAudio();cinematic(C.prologue,'info');});
  document.querySelector('#infoNext')?.addEventListener('click',()=>{state.name=document.querySelector('#name').value.trim();state.time=document.querySelector('#time').value.trim();state.page='route';render();});
  document.querySelectorAll('[data-route]').forEach(b=>b.addEventListener('click',()=>{state.route=b.dataset.route;state.index=0;state.scores=[0,0,0];state.answers=[];state.selectedHost=null;cinematic([C.interludes[0]],'quiz');}));
  document.querySelectorAll('[data-answer]').forEach(b=>b.addEventListener('click',()=>{
    const answerIndex=Number(b.dataset.answer);
    const score=C.questions[state.index].a[answerIndex][1];
    state.answers.push({questionIndex:state.index,answerIndex,question:C.questions[state.index].q,answer:C.questions[state.index].a[answerIndex][0]});
    state.scores=state.scores.map((v,i)=>v+score[i]); state.index++;
    if(state.index>=C.questions.length){cinematic([{chapter:'EPILOGUE',lines:['所有答案都已沉入玻璃底下。','現在，看看誰在另一端凝視你。'],hold:1200}],'result');}
    else cinematic([C.interludes[state.index]],'quiz');
  }));
  document.querySelector('#restart')?.addEventListener('click',()=>{state={page:'start',name:'',time:'',route:null,index:0,scores:[0,0,0],answers:[],muted:state.muted,selectedHost:null};render();});
  document.querySelector('#chooseHost')?.addEventListener('click',()=>{state.note=document.querySelector('#note')?.value||'';state.page='hosts';render();});
  document.querySelector('#backResult')?.addEventListener('click',()=>{state.page='result';render();document.querySelector('#note').value=state.note||'';});
  document.querySelectorAll('[data-host]').forEach(b=>b.addEventListener('click',()=>{
    const host=L.hosts.find(h=>h.id===b.dataset.host);
    if(host){state.selectedHost=host.id;shareToLine(host);}
  }));
}
musicBtn.addEventListener('click',toggleAudio); render();
