'use strict';

const DATA_FILES = {
  setting: './data/setting.json',
  story: './data/story.json',
  questions: './data/questions.json',
  characters: './data/characters.json',
  hosts: './data/hosts.json'
};

const DATA = {};
const app = document.querySelector('#app');
const musicBtn = document.querySelector('#musicBtn');

const initialState = () => ({
  page: 'start',
  route: null,
  index: 0,
  scores: [0, 0, 0],
  answers: [],
  muted: false,
  note: '',
  playerName: '',
  playDate: '',
  selectedHostId: ''
});

let state = initialState();
let audio = null;
let transitionLocked = false;
let liffReady = false;
let liffError = '';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[character]);
}

async function loadJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`無法載入 ${url}，HTTP ${response.status}`);
  }
  return response.json();
}

async function loadAllData() {
  const entries = await Promise.all(
    Object.entries(DATA_FILES).map(async ([key, url]) => [key, await loadJson(url)])
  );
  for (const [key, value] of entries) DATA[key] = value;
}

async function initLiff() {
  if (!window.liff) {
    liffError = 'LIFF SDK 載入失敗';
    return;
  }

  const liffId = DATA.setting?.liffId;
  if (!liffId) {
    liffError = 'setting.json 尚未設定 liffId';
    return;
  }

  try {
    await window.liff.init({ liffId });
    liffReady = true;
    liffError = '';
  } catch (error) {
    console.error(error);
    liffError = error?.message || 'LIFF 初始化失敗';
  }
}

function todayValue() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function initAudio() {
  if (audio || DATA.setting.audio?.enabled === false) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const master = context.createGain();
  master.gain.value = Number(DATA.setting.audio?.volume ?? 0.045);
  master.connect(context.destination);

  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 520;
  filter.connect(master);

  const oscillatorOne = context.createOscillator();
  const oscillatorTwo = context.createOscillator();
  const gainOne = context.createGain();
  const gainTwo = context.createGain();

  oscillatorOne.type = 'sine';
  oscillatorOne.frequency.value = 55;
  gainOne.gain.value = 0.55;

  oscillatorTwo.type = 'triangle';
  oscillatorTwo.frequency.value = 82.4;
  gainTwo.gain.value = 0.12;

  oscillatorOne.connect(gainOne).connect(filter);
  oscillatorTwo.connect(gainTwo).connect(filter);
  oscillatorOne.start();
  oscillatorTwo.start();

  audio = { context, master };
  musicBtn.textContent = 'SOUND ON';
}

function toggleAudio() {
  if (!audio) {
    initAudio();
    return;
  }
  state.muted = !state.muted;
  audio.master.gain.setTargetAtTime(
    state.muted ? 0 : Number(DATA.setting.audio?.volume ?? 0.045),
    audio.context.currentTime,
    0.35
  );
  musicBtn.textContent = state.muted ? 'SOUND OFF' : 'SOUND ON';
}

function waitForAdvance(element, minimumHold) {
  return new Promise(resolve => {
    let ready = false;
    let done = false;

    const finish = () => {
      if (!ready || done) return;
      done = true;
      element.removeEventListener('click', finish);
      resolve();
    };

    element.addEventListener('click', finish);
    setTimeout(() => {
      ready = true;
      element.classList.add('can-continue');
    }, minimumHold);
  });
}

async function cinematic(items, nextPage) {
  if (transitionLocked) return;
  transitionLocked = true;
  app.innerHTML = '<section class="cinema-stage"></section>';
  const stage = app.firstElementChild;

  for (const item of items) {
    stage.classList.remove('visible');
    await sleep(500);
    stage.innerHTML = `
      ${item.chapter ? `<div class="chapter">${escapeHtml(item.chapter)}</div>` : ''}
      <div class="story-lines">${item.lines.map(line => `<p>${escapeHtml(line)}</p>`).join('')}</div>
      <div class="continue-hint">點擊畫面繼續</div>
    `;
    requestAnimationFrame(() => stage.classList.add('visible'));
    await waitForAdvance(stage, item.hold || 900);
  }

  stage.classList.remove('visible');
  await sleep(650);
  transitionLocked = false;
  state.page = nextPage;
  render();
}

function getCharacters() {
  return DATA.characters[state.route] || [];
}

function getResult() {
  const max = Math.max(...state.scores, 1);
  const ranking = getCharacters()
    .map((character, index) => ({
      ...character,
      score: state.scores[index] || 0,
      pct: Math.round((state.scores[index] || 0) / max * 100)
    }))
    .sort((a, b) => b.score - a.score);
  return { ranking, top: ranking[0] };
}

function getHosts() {
  return Array.isArray(DATA.hosts) ? DATA.hosts : [];
}

function getSelectedHost() {
  return getHosts().find(host => host.id === state.selectedHostId) || null;
}

function renderStart(panel) {
  panel.innerHTML = `
    <div class="eyebrow">${escapeHtml(DATA.setting.subtitle)}</div>
    <h1 class="title">${escapeHtml(DATA.setting.title)}</h1>
    <div class="opening-quote">
      ${DATA.story.opening.quote.map(line => `<p>${escapeHtml(line)}</p>`).join('')}
    </div>
    <button class="btn" id="startBtn" type="button">${escapeHtml(DATA.story.opening.button)}</button>
  `;
}

function renderRoute(panel) {
  const route = DATA.setting.routeSelection;
  panel.innerHTML = `
    <div class="eyebrow">SELECT YOUR VIEW</div>
    <h2 class="section-title">${escapeHtml(route.title)}</h2>
    <div class="routes">
      <button class="route" data-route="male" type="button">
        <small>${escapeHtml(route.maleEyebrow)}</small>
        <h3>${escapeHtml(route.maleLabel)}</h3>
        <p>${DATA.characters.male.map(character => escapeHtml(character.name)).join('<br>')}</p>
      </button>
      <button class="route" data-route="female" type="button">
        <small>${escapeHtml(route.femaleEyebrow)}</small>
        <h3>${escapeHtml(route.femaleLabel)}</h3>
        <p>${DATA.characters.female.map(character => escapeHtml(character.name)).join('<br>')}</p>
      </button>
    </div>
  `;
}

function renderQuiz(panel) {
  const question = DATA.questions[state.index];
  panel.innerHTML = `
    <div class="question">
      <div class="qnum">
        QUESTION ${String(state.index + 1).padStart(2, '0')} /
        ${String(DATA.questions.length).padStart(2, '0')}
      </div>
      <p class="scene-text">${escapeHtml(question.scene)}</p>
      <h2>${escapeHtml(question.question)}</h2>
      <div class="answers">
        ${question.answers.map((answer, index) => `
          <button class="answer" data-answer="${index}" type="button">
            <span>${String(index + 1).padStart(2, '0')}</span>
            <span>${escapeHtml(answer.text)}</span>
          </button>
        `).join('')}
      </div>
      <div class="progress">
        <i style="width:${(state.index + 1) / DATA.questions.length * 100}%"></i>
      </div>
    </div>
  `;
}

function renderResult(panel) {
  const { ranking, top } = getResult();
  const resultSetting = DATA.setting.result;

  panel.innerHTML = `
    <div class="eyebrow">${escapeHtml(resultSetting.eyebrow)}</div>
    <div class="result-card">
      <img src="${escapeHtml(top.image)}" alt="${escapeHtml(top.name)}">
      <div class="result-name">
        <h1>${escapeHtml(top.name)}</h1>
        <p>${escapeHtml(top.kr)}</p>
      </div>
    </div>
    <p class="desc">${escapeHtml(top.description)}</p>
    <div class="eyebrow resonance-title">${escapeHtml(resultSetting.resonanceLabel)}</div>
    <div class="rank">
      ${ranking.map(character => `
        <div class="rank-row">
          <span>${escapeHtml(character.name)}</span>
          <div class="bar"><i style="width:${character.pct}%"></i></div>
          <b>${character.pct}%</b>
        </div>
      `).join('')}
    </div>
    <div class="note">
      <textarea id="note" maxlength="500"
        placeholder="${escapeHtml(resultSetting.notePlaceholder)}">${escapeHtml(state.note)}</textarea>
    </div>
    <div class="actions">
      <button class="btn" id="goShare" type="button">${escapeHtml(resultSetting.shareButton)}</button>
      <button class="ghost" id="restart" type="button">${escapeHtml(resultSetting.restartButton)}</button>
    </div>
    <p class="share-status">按下傳送後，才會填寫姓名、日期並開啟 LINE 分享視窗。</p>
  `;
}

function renderShare(panel) {
  const { top } = getResult();
  const shareSetting = DATA.setting.share;
  if (!state.playDate) state.playDate = todayValue();

  panel.classList.add('share-panel');
  panel.innerHTML = `
    <div class="eyebrow">${escapeHtml(shareSetting.eyebrow)}</div>
    <h2 class="section-title">${escapeHtml(shareSetting.title)}</h2>

    <div class="share-result-mini">
      <img src="${escapeHtml(top.image)}" alt="${escapeHtml(top.name)}">
      <div>
        <small>你的結果</small>
        <strong>${escapeHtml(top.name)}</strong>
        <span>${top.pct}% 共鳴</span>
      </div>
    </div>

    <div class="fields">
      <div class="field">
        <label for="playerName">${escapeHtml(shareSetting.playerNameLabel)}</label>
        <input id="playerName" maxlength="40" autocomplete="name"
          value="${escapeHtml(state.playerName)}" placeholder="請輸入姓名或稱呼">
      </div>
      <div class="field">
        <label for="playDate">${escapeHtml(shareSetting.dateLabel)}</label>
        <input id="playDate" type="date" value="${escapeHtml(state.playDate)}">
      </div>
    </div>

    <div class="eyebrow host-heading">${escapeHtml(shareSetting.hostLabel)}</div>
    <p class="host-intro">請先選擇主持人，再於 LINE 分享視窗中選擇該主持人的聊天室。</p>
    <div class="host-grid">
      ${getHosts().map(host => `
        <label class="host-card host-option">
          <input type="radio" name="host" value="${escapeHtml(host.id)}"
            ${host.id === state.selectedHostId ? 'checked' : ''}>
          <strong>${escapeHtml(host.displayName || host.name)}</strong>
          <span>${escapeHtml(host.note || '')}</span>
        </label>
      `).join('')}
    </div>

    <div class="actions">
      <button class="btn" id="sendToLine" type="button">${escapeHtml(shareSetting.button)}</button>
      <button class="ghost" id="backToResult" type="button">${escapeHtml(shareSetting.backButton)}</button>
    </div>
    <p class="share-status" id="shareStatus">
      只有按下上方按鈕後，才會呼叫 LINE Share Target Picker。
    </p>
  `;
}

function renderSuccess(panel) {
  const host = getSelectedHost();
  panel.innerHTML = `
    <div class="eyebrow">MESSAGE DELIVERED</div>
    <h2 class="section-title">分享流程已完成</h2>
    <p class="desc">
      請確認剛才選擇的是「${escapeHtml(host?.displayName || host?.name || '指定主持人')}」的聊天室。
    </p>
    <div class="actions">
      <button class="btn" id="shareAgain" type="button">再次分享</button>
      <button class="ghost" id="restart" type="button">重新測驗</button>
    </div>
  `;
}

function render() {
  app.innerHTML = '';
  const panel = document.createElement('section');
  panel.className = 'panel';

  if (state.page === 'start') renderStart(panel);
  else if (state.page === 'route') renderRoute(panel);
  else if (state.page === 'quiz') renderQuiz(panel);
  else if (state.page === 'result') renderResult(panel);
  else if (state.page === 'share') renderShare(panel);
  else if (state.page === 'success') renderSuccess(panel);

  app.appendChild(panel);
  bind();
}

function answerQuestion(answerIndex) {
  const question = DATA.questions[state.index];
  const answer = question.answers[answerIndex];

  state.answers.push({
    questionIndex: state.index,
    answerIndex,
    question: question.question,
    answer: answer.text
  });

  state.scores = state.scores.map(
    (score, index) => score + Number(answer.score[index] || 0)
  );
  state.index += 1;

  if (state.index >= DATA.questions.length) {
    cinematic(DATA.story.epilogue, 'result');
  } else {
    cinematic([DATA.story.interludes[state.index]], 'quiz');
  }
}

function saveShareForm() {
  state.playerName = document.querySelector('#playerName')?.value.trim() || '';
  state.playDate = document.querySelector('#playDate')?.value || '';
  state.selectedHostId =
    document.querySelector('input[name="host"]:checked')?.value || state.selectedHostId;
}

function setShareStatus(message) {
  const element = document.querySelector('#shareStatus');
  if (element) element.textContent = message;
}

function buildShareMessage() {
  const { ranking, top } = getResult();
  const host = getSelectedHost();
  const routeName = state.route === 'male' ? '男角路線' : '女角路線';

  return [
    `【${DATA.setting.title}｜角色測驗結果】`,
    '',
    `指定主持人：${host?.displayName || host?.name || '未指定'}`,
    `玩家：${state.playerName}`,
    `遊玩日期：${state.playDate}`,
    `選擇路線：${routeName}`,
    `結果角色：${top.name}`,
    `最高共鳴度：${top.pct}%`,
    '',
    '角色共鳴排行：',
    ...ranking.map((character, index) => `${index + 1}. ${character.name} ${character.pct}%`),
    '',
    '玩家留言：',
    state.note.trim() || '無'
  ].join('\n');
}

async function sendToLine() {
  saveShareForm();

  if (!state.playerName) {
    setShareStatus('請先填寫玩家姓名。');
    document.querySelector('#playerName')?.focus();
    return;
  }
  if (!state.playDate) {
    setShareStatus('請先選擇遊玩日期。');
    return;
  }
  if (!getSelectedHost()) {
    setShareStatus('請先選擇主持人。');
    return;
  }

  if (!liffReady) {
    setShareStatus(`LINE 尚未就緒：${liffError || '正在重新初始化'}`);
    await initLiff();
    if (!liffReady) return;
  }

  if (!window.liff.isLoggedIn()) {
    window.liff.login({ redirectUri: window.location.href });
    return;
  }

  if (!window.liff.isApiAvailable('shareTargetPicker')) {
    setShareStatus('目前環境不支援 LINE 分享視窗，請從 LINE App 開啟。');
    return;
  }

  const button = document.querySelector('#sendToLine');
  if (button) button.disabled = true;

  try {
    const response = await window.liff.shareTargetPicker(
      [{ type: 'text', text: buildShareMessage() }],
      { isMultiple: false }
    );

    if (response) {
      state.page = 'success';
      render();
    } else {
      setShareStatus('你取消了分享，測驗結果仍保留。');
    }
  } catch (error) {
    console.error(error);
    setShareStatus(`LINE 分享失敗：${error?.message || '未知錯誤'}`);
  } finally {
    if (button) button.disabled = false;
  }
}

function restart() {
  const muted = state.muted;
  state = initialState();
  state.muted = muted;
  render();
}

function bind() {
  document.querySelector('#startBtn')?.addEventListener('click', () => {
    initAudio();
    cinematic(DATA.story.prologue, 'route');
  });

  document.querySelectorAll('[data-route]').forEach(button => {
    button.addEventListener('click', () => {
      state.route = button.dataset.route;
      state.index = 0;
      state.scores = [0, 0, 0];
      state.answers = [];
      cinematic([DATA.story.interludes[0]], 'quiz');
    });
  });

  document.querySelectorAll('[data-answer]').forEach(button => {
    button.addEventListener('click', () => answerQuestion(Number(button.dataset.answer)));
  });

  document.querySelector('#goShare')?.addEventListener('click', () => {
    state.note = document.querySelector('#note')?.value || '';
    state.page = 'share';
    render();
  });

  document.querySelector('#sendToLine')?.addEventListener('click', sendToLine);

  document.querySelector('#backToResult')?.addEventListener('click', () => {
    saveShareForm();
    state.page = 'result';
    render();
  });

  document.querySelector('#shareAgain')?.addEventListener('click', () => {
    state.page = 'share';
    render();
  });

  document.querySelector('#restart')?.addEventListener('click', restart);

  document.querySelectorAll('input[name="host"]').forEach(input => {
    input.addEventListener('change', () => {
      state.selectedHostId = input.value;
    });
  });
}

async function boot() {
  try {
    await loadAllData();
    document.title = `${DATA.setting.title}｜角色測驗`;
    render();
    initLiff();
  } catch (error) {
    console.error(error);
    app.innerHTML = `
      <section class="panel">
        <div class="eyebrow">LOAD ERROR</div>
        <h1 class="title">資料載入失敗</h1>
        <p class="desc">${escapeHtml(error.message)}</p>
        <p class="share-status">請透過 GitHub Pages 或本機 HTTP Server 開啟，不要直接雙擊 index.html。</p>
      </section>
    `;
  }
}

musicBtn.addEventListener('click', toggleAudio);
boot();
