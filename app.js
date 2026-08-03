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

function getGoogleSheetEndpoint() {
  return String(DATA.setting?.googleSheets?.webAppUrl || '').trim();
}

function createSubmissionId() {
  return window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function buildGoogleSheetPayload() {
  const { ranking, top } = result();

  return {
    submissionId: createSubmissionId(),
    submittedAt: new Date().toISOString(),
    scriptId: activeScriptId || '',
    scriptName: DATA.setting?.name || DATA.setting?.title || '',
    playerName: state.playerName,
    playDate: state.playDate,
    route:
      state.route === 'male'
        ? '男角路線'
        : state.route === 'female'
          ? '女角路線'
          : '',
    resultCharacterId: top?.id || '',
    resultCharacter: top?.name || '',
    resultPercentage: Number(top?.pct || 0),
    ranking: ranking.map(character => ({
      id: character.id || '',
      name: character.name || '',
      score: Number(character.score || 0),
      percentage: Number(character.pct || 0)
    })),
    note: state.note || '',
    scores: [...state.scores],
    answers: [...state.answers],
    pageUrl: window.location.href,
    userAgent: navigator.userAgent
  };
}

async function postResultToGoogleSheet(payload) {
  const endpoint = getGoogleSheetEndpoint();

  if (!endpoint) {
    throw new Error('尚未設定 Google Apps Script Web App URL');
  }

  await fetch(endpoint, {
    method: 'POST',
    mode: 'no-cors',
    cache: 'no-store',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(payload)
  });
}


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
    `/?script=${encodeURIComponent(scriptId)}`;

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
    loadJson('/data/index.json'), loadJson('/data/settings.json'), loadJson('/data/hosts.json')
  ]);
}

async function loadScript(id) {
  const base = `/data/scripts/${id}`;
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
function renderQuiz(p) {
  const q = DATA.questions[state.index];
  const type = q.type || 'single';
  const progress =
    (state.index + 1) /
    DATA.questions.length *
    100;

  let controlHtml = '';

  if (type === 'bestWorst') {
    controlHtml = `
      <div class="best-worst-help">
        <span>先選最喜歡</span>
        <span>再選最不喜歡</span>
      </div>

      <div class="best-worst-options">
        ${(q.answers || []).map((answer, index) => `
          <div class="best-worst-option" data-bw-option="${index}">
            <div class="best-worst-text">
              <span>${String(index + 1).padStart(2, '0')}</span>
              <strong>${esc(answer.text)}</strong>
            </div>

            <div class="best-worst-actions">
              <button
                class="choice-mark most"
                data-most="${index}"
                type="button"
              >
                最喜歡
              </button>

              <button
                class="choice-mark least"
                data-least="${index}"
                type="button"
              >
                最不喜歡
              </button>
            </div>
          </div>
        `).join('')}
      </div>

      <p class="question-hint" id="questionHint">
        請各選一個選項，兩者不能相同。
      </p>

      <button
        class="btn question-submit"
        id="submitBestWorst"
        type="button"
        disabled
      >
        確認選擇
      </button>
    `;
  } else if (type === 'slider') {
    const slider = q.slider || {};
    const min = Number(slider.min ?? 0);
    const max = Number(slider.max ?? 100);
    const step = Number(slider.step ?? 1);
    const defaultValue = Number(
      slider.default ?? ((min + max) / 2)
    );

    controlHtml = `
      <div class="slider-question-card">
        <div class="slider-value" id="sliderValue">
          ${defaultValue}
        </div>

        <input
          class="degree-slider"
          id="degreeSlider"
          type="range"
          min="${min}"
          max="${max}"
          step="${step}"
          value="${defaultValue}"
        >

        <div class="slider-labels">
          <span>${esc(slider.leftLabel || '偏左')}</span>
          <span>${esc(slider.centerLabel || '彼此平衡')}</span>
          <span>${esc(slider.rightLabel || '偏右')}</span>
        </div>
      </div>

      <button
        class="btn question-submit"
        id="submitSlider"
        type="button"
      >
        確認程度
      </button>
    `;
  } else {
    controlHtml = `
      <div class="answers">
        ${(q.answers || []).map((answer, index) => `
          <button
            class="answer"
            data-answer="${index}"
            type="button"
          >
            <span>${String(index + 1).padStart(2, '0')}</span>
            <span>${esc(answer.text)}</span>
          </button>
        `).join('')}
      </div>
    `;
  }

  p.innerHTML = `
    <div class="question">
      <div class="qnum">
        QUESTION ${String(state.index + 1).padStart(2, '0')}
        /
        ${String(DATA.questions.length).padStart(2, '0')}
      </div>

      <p class="scene-text">${esc(q.scene || '')}</p>
      <h2>${esc(q.question || '')}</h2>

      ${controlHtml}

      <div class="progress">
        <i style="width:${progress}%"></i>
      </div>
    </div>
  `;
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
function renderShare(p) {
  const { top } = result();
  const shareSetting = DATA.setting.share || {};

  if (!state.playDate) {
    state.playDate = todayValue();
  }

  p.classList.add('share-panel');

  p.innerHTML = `
    <div class="eyebrow">
      ${esc(shareSetting.eyebrow || 'SUBMIT YOUR RESULT')}
    </div>

    <h2 class="section-title">
      ${esc(shareSetting.title || '留下你的測驗結果')}
    </h2>

    <div class="share-result-mini">
      <img src="${esc(top.image)}" alt="${esc(top.name)}">
      <div>
        <small>你的結果</small>
        <strong>${esc(top.name)}</strong>
        <span>${top.pct}% 共鳴</span>
      </div>
    </div>

    <div class="fields">
      <div class="field">
        <label for="playerName">
          ${esc(shareSetting.playerNameLabel || '玩家姓名 PLAYER NAME')}
        </label>
        <input
          id="playerName"
          maxlength="40"
          autocomplete="name"
          value="${esc(state.playerName)}"
          placeholder="請輸入姓名或稱呼"
        >
      </div>

      <div class="field">
        <label for="playDate">
          ${esc(shareSetting.dateLabel || '遊玩日期 PLAY DATE')}
        </label>
        <input id="playDate" type="date" value="${esc(state.playDate)}">
      </div>
    </div>

    <div class="actions">
      <button class="btn" id="submitToSheet" type="button">確認送出</button>
      <button class="ghost" id="backToResult" type="button">返回測驗結果</button>
    </div>

    <p class="share-status" id="shareStatus">
      確認後會將姓名、日期與完整測驗結果送至登記表。
    </p>
  `;
}

function renderSuccess(p) {
  const { top } = result();

  p.innerHTML = `
    <div class="eyebrow">RESULT SUBMITTED</div>
    <h2 class="section-title">測驗結果已送出</h2>

    <div class="share-result-mini">
      <img src="${esc(top.image)}" alt="${esc(top.name)}">
      <div>
        <small>角色結果</small>
        <strong>${esc(top.name)}</strong>
        <span>${top.pct}% 共鳴</span>
      </div>
    </div>

    <p class="desc">姓名、日期與完整測驗結果已送至登記表。</p>

    <div class="actions">
      <button class="ghost" id="restart" type="button">重新測驗</button>
    </div>
  `;
}

function render(){
  app.innerHTML=''; const p=document.createElement('section');p.className='panel';
  ({scriptSelect:renderScriptSelect,start:renderStart,route:renderRoute,quiz:renderQuiz,result:renderResult,share:renderShare,success:renderSuccess}[state.page]||renderScriptSelect)(p);
  app.appendChild(p); bind();
}

function addScores(scoreArray) {
  state.scores = state.scores.map(
    (current, index) =>
      current + Number(scoreArray?.[index] || 0)
  );
}

function finishQuestion(answerRecord) {
  state.answers.push({
    questionIndex: state.index,
    type:
      DATA.questions[state.index].type ||
      'single',
    ...answerRecord
  });

  state.index += 1;

  if (state.index >= DATA.questions.length) {
    cinematic(
      DATA.story.epilogue,
      'result'
    );
  } else {
    cinematic(
      [DATA.story.interludes[state.index] || {}],
      'quiz'
    );
  }
}

function answer(i) {
  const q = DATA.questions[state.index];
  const a = q.answers[i];

  addScores(a.score);

  finishQuestion({
    answerIndex: i,
    answer: a.text
  });
}

function answerBestWorst(
  mostIndex,
  leastIndex
) {
  const q = DATA.questions[state.index];
  const most = q.answers[mostIndex];
  const least = q.answers[leastIndex];

  addScores(
    most.mostScore ||
    most.score
  );

  addScores(
    least.leastScore
  );

  finishQuestion({
    mostIndex,
    leastIndex,
    mostAnswer: most.text,
    leastAnswer: least.text
  });
}

function answerSlider(value) {
  const q = DATA.questions[state.index];
  const slider = q.slider || {};

  const min = Number(slider.min ?? 0);
  const max = Number(slider.max ?? 100);
  const numericValue = Number(value);

  const ratio =
    max === min
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            (numericValue - min) /
              (max - min)
          )
        );

  const minScore =
    slider.minScore || [0, 0, 0];

  const maxScore =
    slider.maxScore || [0, 0, 0];

  const interpolated =
    state.scores.map((_, index) => {
      const low =
        Number(minScore[index] || 0);

      const high =
        Number(maxScore[index] || 0);

      return (
        low +
        (high - low) * ratio
      );
    });

  addScores(interpolated);

  finishQuestion({
    value: numericValue,
    ratio
  });
}
function saveForm() {
  state.playerName =
    document.querySelector('#playerName')?.value.trim() || '';

  state.playDate =
    document.querySelector('#playDate')?.value || '';
}

function status(t){const e=document.querySelector('#shareStatus');if(e)e.textContent=t}
async function submitResultToSheet() {
  saveForm();

  if (!state.playerName) {
    status('請先填寫玩家姓名。');
    document.querySelector('#playerName')?.focus();
    return;
  }

  if (!state.playDate) {
    status('請先選擇遊玩日期。');
    document.querySelector('#playDate')?.focus();
    return;
  }

  if (!getGoogleSheetEndpoint()) {
    status('尚未設定 Google Sheet 接收網址，請聯絡管理員。');
    return;
  }

  const button = document.querySelector('#submitToSheet');

  if (button) {
    button.disabled = true;
    button.textContent = '送出中…';
  }

  status('正在送出測驗結果…');

  try {
    await postResultToGoogleSheet(buildGoogleSheetPayload());
    state.page = 'success';
    render();
  } catch (error) {
    console.error('Google Sheet submit failed', error);
    status(`送出失敗：${error?.message || '請檢查網路後重試'}`);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = '確認送出';
    }
  }
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
  let mostIndex = null;
  let leastIndex = null;

  const updateBestWorst = () => {
    document
      .querySelectorAll('[data-most]')
      .forEach(button => {
        button.classList.toggle(
          'selected',
          Number(button.dataset.most) === mostIndex
        );
      });

    document
      .querySelectorAll('[data-least]')
      .forEach(button => {
        button.classList.toggle(
          'selected',
          Number(button.dataset.least) === leastIndex
        );
      });

    const submit =
      document.querySelector('#submitBestWorst');

    if (submit) {
      submit.disabled =
        mostIndex === null ||
        leastIndex === null ||
        mostIndex === leastIndex;
    }

    const hint =
      document.querySelector('#questionHint');

    if (
      hint &&
      mostIndex !== null &&
      leastIndex !== null &&
      mostIndex === leastIndex
    ) {
      hint.textContent =
        '最喜歡和最不喜歡不能選同一個選項。';
    } else if (hint) {
      hint.textContent =
        '請各選一個選項，兩者不能相同。';
    }
  };

  document
    .querySelectorAll('[data-most]')
    .forEach(button => {
      button.addEventListener('click', () => {
        mostIndex =
          Number(button.dataset.most);

        updateBestWorst();
      });
    });

  document
    .querySelectorAll('[data-least]')
    .forEach(button => {
      button.addEventListener('click', () => {
        leastIndex =
          Number(button.dataset.least);

        updateBestWorst();
      });
    });

  document
    .querySelector('#submitBestWorst')
    ?.addEventListener('click', () => {
      if (
        mostIndex === null ||
        leastIndex === null ||
        mostIndex === leastIndex
      ) {
        return;
      }

      answerBestWorst(
        mostIndex,
        leastIndex
      );
    });

  const degreeSlider =
    document.querySelector('#degreeSlider');

  if (degreeSlider) {
    const valueLabel =
      document.querySelector('#sliderValue');

    const updateSliderValue = () => {
      if (valueLabel) {
        valueLabel.textContent =
          degreeSlider.value;
      }
    };

    degreeSlider.addEventListener(
      'input',
      updateSliderValue
    );

    updateSliderValue();
  }

  document
    .querySelector('#submitSlider')
    ?.addEventListener('click', () => {
      answerSlider(
        document
          .querySelector('#degreeSlider')
          ?.value
      );
    });

  document.querySelector('#goShare')?.addEventListener('click',()=>{state.note=document.querySelector('#note')?.value||'';state.page='share';render()});
  document.querySelector('#submitToSheet')?.addEventListener('click',submitResultToSheet);
  document.querySelector('#backToResult')?.addEventListener('click',()=>{saveForm();state.page='result';render()});
  document.querySelector('#restart')?.addEventListener('click',restart);
}
async function boot() {
  try {
    await loadGlobalData();

    const resumeRequested =
      new URLSearchParams(
        window.location.search
      ).get('resumeShare') === '1';

    const savedLineState =
      resumeRequested
        ? loadSavedLineState()
        : null;

    const requestedScriptId =
      savedLineState?.scriptId ||
      getRequestedScriptId();

    if (requestedScriptId) {
      const meta =
        getScriptMeta(
          requestedScriptId
        );

      if (
        !meta ||
        meta.status === 'draft'
      ) {
        clearSavedLineState();

        showScriptNotFound(
          requestedScriptId
        );

        
        return;
      }

      await loadScript(
        requestedScriptId
      );

      setScriptUrl(
        requestedScriptId,
        true
      );

      if (savedLineState) {
        state = {
          ...resetState(),
          ...savedLineState.state,
          page: 'share'
        };
      } else {
        state.page = 'start';
      }

      render();
      

      if (savedLineState) {
        status(
          liffReady &&
          liff.isLoggedIn()
            ? 'LINE 登入完成。請再按一次「開啟 LINE 選擇聊天室」。'
            : '已恢復測驗結果，請再按一次傳送。'
        );
      }

      return;
    }

    state.page =
      'scriptSelect';

    render();
    
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
