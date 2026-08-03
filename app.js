'use strict';

const C = window.QUIZ_CONFIG;

const L = window.LIFF_CONFIG || {
  liffId: 'YOUR_LIFF_ID',
  hosts: []
};

const app = document.querySelector('#app');
const musicBtn = document.querySelector('#musicBtn');

const INITIAL_STATE = {
  page: 'start',
  route: null,
  index: 0,
  scores: [0, 0, 0],
  answers: [],
  muted: false,
  note: '',
  playerName: '',
  playDate: '',
  selectedHostId: '',
  shareCompleted: false
};

let state = {
  ...INITIAL_STATE
};

let audio = null;
let transitionLocked = false;
let liffReady = false;
let liffError = '';

const sleep = milliseconds =>
  new Promise(resolve => {
    window.setTimeout(resolve, milliseconds);
  });

function escapeHtml(value = '') {
  return String(value).replace(
    /[&<>'"]/g,
    character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    })[character]
  );
}

function todayValue() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset();

  return new Date(
    now.getTime() - timezoneOffset * 60 * 1000
  )
    .toISOString()
    .slice(0, 10);
}

function getHosts() {
  if (!Array.isArray(L.hosts)) {
    return [];
  }

  return L.hosts.filter(host => {
    return (
      host &&
      typeof host === 'object' &&
      typeof host.id === 'string' &&
      host.id.trim()
    );
  });
}

function getSelectedHost() {
  return getHosts().find(host => {
    return host.id === state.selectedHostId;
  }) || null;
}

async function initLiff() {
  if (!window.liff) {
    liffError = 'LIFF SDK 載入失敗';
    return;
  }

  if (
    !L.liffId ||
    L.liffId === 'YOUR_LIFF_ID'
  ) {
    liffError = '尚未設定 LIFF ID';
    return;
  }

  try {
    await window.liff.init({
      liffId: L.liffId
    });

    liffReady = true;
    liffError = '';
  } catch (error) {
    console.error('LIFF 初始化失敗', error);

    liffError =
      error && error.message
        ? error.message
        : 'LIFF 初始化失敗';
  }
}

function initAudio() {
  if (audio) {
    return;
  }

  const AudioContextClass =
    window.AudioContext ||
    window.webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  const context = new AudioContextClass();

  const master = context.createGain();
  master.gain.value = 0.045;
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

  oscillatorOne
    .connect(gainOne)
    .connect(filter);

  oscillatorTwo
    .connect(gainTwo)
    .connect(filter);

  oscillatorOne.start();
  oscillatorTwo.start();

  const lowFrequencyOscillator =
    context.createOscillator();

  const lowFrequencyGain =
    context.createGain();

  lowFrequencyOscillator.frequency.value = 0.08;
  lowFrequencyGain.gain.value = 180;

  lowFrequencyOscillator
    .connect(lowFrequencyGain)
    .connect(filter.frequency);

  lowFrequencyOscillator.start();

  audio = {
    context,
    master
  };

  musicBtn.textContent = 'SOUND ON';
}

function toggleAudio() {
  if (!audio) {
    initAudio();
    return;
  }

  state.muted = !state.muted;

  audio.master.gain.setTargetAtTime(
    state.muted ? 0 : 0.045,
    audio.context.currentTime,
    0.35
  );

  musicBtn.textContent =
    state.muted
      ? 'SOUND OFF'
      : 'SOUND ON';
}

async function cinematic(items, nextPage) {
  if (transitionLocked) {
    return;
  }

  transitionLocked = true;

  app.innerHTML =
    '<section class="cinema-stage"></section>';

  const stage = app.firstElementChild;

  for (const item of items) {
    stage.classList.remove('visible');

    await sleep(500);

    const chapterHtml = item.chapter
      ? `
        <div class="chapter">
          ${escapeHtml(item.chapter)}
        </div>
      `
      : '';

    const linesHtml = item.lines
      .map(line => {
        return `<p>${escapeHtml(line)}</p>`;
      })
      .join('');

    stage.innerHTML = `
      ${chapterHtml}

      <div class="story-lines">
        ${linesHtml}
      </div>

      <div class="continue-hint">
        點擊畫面繼續
      </div>
    `;

    window.requestAnimationFrame(() => {
      stage.classList.add('visible');
    });

    await waitForAdvance(
      stage,
      item.hold || 900
    );
  }

  stage.classList.remove('visible');

  await sleep(650);

  transitionLocked = false;
  state.page = nextPage;

  render();
}

function waitForAdvance(element, minimumHold) {
  return new Promise(resolve => {
    let ready = false;
    let completed = false;

    const finish = () => {
      if (!ready || completed) {
        return;
      }

      completed = true;

      element.removeEventListener(
        'click',
        finish
      );

      resolve();
    };

    element.addEventListener(
      'click',
      finish
    );

    window.setTimeout(() => {
      ready = true;
      element.classList.add('can-continue');
    }, minimumHold);
  });
}

function getResult() {
  const characters =
    C.characters[state.route] || [];

  const highestScore = Math.max(
    ...state.scores,
    1
  );

  const ranking = characters
    .map((character, index) => {
      const score =
        Number(state.scores[index]) || 0;

      return {
        ...character,
        score,
        pct: Math.round(
          score / highestScore * 100
        )
      };
    })
    .sort((first, second) => {
      return second.score - first.score;
    });

  return {
    ranking,
    top: ranking[0]
  };
}

function renderStartPage(panel) {
  const openingLines = C.opening.quote
    .map(line => {
      return `<p>${escapeHtml(line)}</p>`;
    })
    .join('');

  panel.innerHTML = `
    <div class="eyebrow">
      ${escapeHtml(C.subtitle)}
    </div>

    <h1 class="title">
      ${escapeHtml(C.title)}
    </h1>

    <div class="opening-quote">
      ${openingLines}
    </div>

    <button
      class="btn"
      id="startBtn"
      type="button"
    >
      ${escapeHtml(C.opening.button)}
    </button>
  `;
}

function renderRoutePage(panel) {
  const maleCharacters =
    C.characters.male
      .map(character => {
        return escapeHtml(character.name);
      })
      .join('<br>');

  const femaleCharacters =
    C.characters.female
      .map(character => {
        return escapeHtml(character.name);
      })
      .join('<br>');

  panel.innerHTML = `
    <div class="eyebrow">
      SELECT YOUR VIEW
    </div>

    <h2 class="section-title">
      你要透過誰的眼睛，走進故事？
    </h2>

    <div class="routes">
      <button
        class="route"
        data-route="male"
        type="button"
      >
        <small>MALE ROUTE</small>
        <h3>男角路線</h3>
        <p>${maleCharacters}</p>
      </button>

      <button
        class="route"
        data-route="female"
        type="button"
      >
        <small>FEMALE ROUTE</small>
        <h3>女角路線</h3>
        <p>${femaleCharacters}</p>
      </button>
    </div>
  `;
}

function renderQuizPage(panel) {
  const question =
    C.questions[state.index];

  if (!question) {
    state.page = 'result';
    render();
    return;
  }

  const answersHtml = question.a
    .map((answer, index) => {
      return `
        <button
          class="answer"
          data-answer="${index}"
          type="button"
        >
          <span>
            ${String(index + 1).padStart(2, '0')}
          </span>

          <span>
            ${escapeHtml(answer[0])}
          </span>
        </button>
      `;
    })
    .join('');

  const progress =
    (state.index + 1) /
    C.questions.length *
    100;

  panel.innerHTML = `
    <div class="question">
      <div class="qnum">
        QUESTION
        ${String(state.index + 1).padStart(2, '0')}
        /
        ${String(C.questions.length).padStart(2, '0')}
      </div>

      <p class="scene-text">
        ${escapeHtml(question.scene)}
      </p>

      <h2>
        ${escapeHtml(question.q)}
      </h2>

      <div class="answers">
        ${answersHtml}
      </div>

      <div class="progress">
        <i style="width:${progress}%"></i>
      </div>
    </div>
  `;
}

function renderResultPage(panel) {
  const result = getResult();
  const ranking = result.ranking;
  const top = result.top;

  if (!top) {
    state.page = 'start';
    render();
    return;
  }

  const rankingHtml = ranking
    .map(character => {
      return `
        <div class="rank-row">
          <span>
            ${escapeHtml(character.name)}
          </span>

          <div class="bar">
            <i style="width:${character.pct}%"></i>
          </div>

          <b>${character.pct}%</b>
        </div>
      `;
    })
    .join('');

  panel.innerHTML = `
    <div class="eyebrow">
      YOUR SOUL CHARACTER
    </div>

    <div class="result-card">
      <img
        src="${escapeHtml(top.image)}"
        alt="${escapeHtml(top.name)}"
      >

      <div class="result-name">
        <h1>
          ${escapeHtml(top.name)}
        </h1>

        <p>
          ${escapeHtml(top.kr)}
        </p>
      </div>
    </div>

    <p class="desc">
      ${escapeHtml(top.desc)}
    </p>

    <div class="eyebrow resonance-title">
      靈魂共鳴度 RESONANCE
    </div>

    <div class="rank">
      ${rankingHtml}
    </div>

    <div class="note">
      <textarea
        id="note"
        maxlength="500"
        placeholder="寫下你對角色的期待、雷點，或想告訴主持人的話…"
      >${escapeHtml(state.note)}</textarea>
    </div>

    <div class="actions">
      <button
        class="btn"
        id="goShare"
        type="button"
      >
        傳送給主持人
      </button>

      <button
        class="ghost"
        id="restart"
        type="button"
      >
        重新測驗
      </button>
    </div>

    <p
      class="share-status"
      id="shareStatus"
    >
      按下傳送後才會填寫姓名、日期與主持人。
    </p>
  `;
}

function renderShareFormPage(panel) {
  const result = getResult();
  const top = result.top;
  const hosts = getHosts();

  if (!top) {
    state.page = 'start';
    render();
    return;
  }

  if (!state.playDate) {
    state.playDate = todayValue();
  }

  const hostsHtml = hosts.length
    ? hosts
      .map(host => {
        const selected =
          host.id === state.selectedHostId;

        return `
          <label class="host-card host-option">
            <input
              type="radio"
              name="host"
              value="${escapeHtml(host.id)}"
              ${selected ? 'checked' : ''}
            >

            <strong>
              ${escapeHtml(
                host.displayName ||
                host.name ||
                '主持人'
              )}
            </strong>

            <span>
              ${escapeHtml(
                host.note ||
                '主持人'
              )}
            </span>
          </label>
        `;
      })
      .join('')
    : `
      <p class="share-status">
        liff-config.js 尚未設定主持人。
      </p>
    `;

  panel.classList.add('share-panel');

  panel.innerHTML = `
    <div class="eyebrow">
      DELIVER YOUR RESULT
    </div>

    <h2 class="section-title">
      把答案交給引路人
    </h2>

    <div class="share-result-mini">
      <img
        src="${escapeHtml(top.image)}"
        alt="${escapeHtml(top.name)}"
      >

      <div>
        <small>你的結果</small>

        <strong>
          ${escapeHtml(top.name)}
        </strong>

        <span>
          ${top.pct}% 共鳴
        </span>
      </div>
    </div>

    <div class="fields">
      <div class="field">
        <label for="playerName">
          玩家姓名 PLAYER NAME
        </label>

        <input
          id="playerName"
          maxlength="40"
          autocomplete="name"
          placeholder="請輸入姓名或稱呼"
          value="${escapeHtml(state.playerName)}"
        >
      </div>

      <div class="field">
        <label for="playDate">
          遊玩日期 PLAY DATE
        </label>

        <input
          id="playDate"
          type="date"
          value="${escapeHtml(state.playDate)}"
        >
      </div>
    </div>

    <div class="eyebrow host-heading">
      SELECT HOST
    </div>

    <p class="host-intro">
      請先標記要傳給哪位主持人。
      下一步開啟 LINE 分享視窗後，
      再親自選擇該主持人的聊天室。
    </p>

    <div class="host-grid">
      ${hostsHtml}
    </div>

    <div class="actions">
      <button
        class="btn"
        id="sendToLine"
        type="button"
        ${hosts.length ? '' : 'disabled'}
      >
        開啟 LINE 選擇聊天室
      </button>

      <button
        class="ghost"
        id="backToResult"
        type="button"
      >
        返回測驗結果
      </button>
    </div>

    <p
      class="share-status"
      id="shareStatus"
    >
      只有按下上方按鈕後，才會開啟 LINE 分享功能。
    </p>
  `;
}

function renderShareSuccessPage(panel) {
  const result = getResult();
  const top = result.top;
  const host = getSelectedHost();

  panel.classList.add('share-panel');

  panel.innerHTML = `
    <div class="eyebrow">
      MESSAGE DELIVERED
    </div>

    <h2 class="section-title">
      分享流程已完成
    </h2>

    ${
      top
        ? `
          <div class="share-result-mini">
            <img
              src="${escapeHtml(top.image)}"
              alt="${escapeHtml(top.name)}"
            >

            <div>
              <small>角色結果</small>

              <strong>
                ${escapeHtml(top.name)}
              </strong>

              <span>
                ${top.pct}% 共鳴
              </span>
            </div>
          </div>
        `
        : ''
    }

    <p class="desc">
      ${
        host
          ? `請確認剛才選擇的是「${escapeHtml(
              host.displayName ||
              host.name
            )}」的聊天室。`
          : '請確認訊息已傳送至正確的主持人聊天室。'
      }
    </p>

    <div class="actions">
      <button
        class="btn"
        id="shareAgain"
        type="button"
      >
        再次分享
      </button>

      <button
        class="ghost"
        id="restart"
        type="button"
      >
        重新測驗
      </button>
    </div>
  `;
}

function render() {
  app.innerHTML = '';

  const panel =
    document.createElement('section');

  panel.className = 'panel';

  switch (state.page) {
    case 'start':
      renderStartPage(panel);
      break;

    case 'route':
      renderRoutePage(panel);
      break;

    case 'quiz':
      renderQuizPage(panel);
      break;

    case 'result':
      renderResultPage(panel);
      break;

    case 'shareForm':
      renderShareFormPage(panel);
      break;

    case 'shareSuccess':
      renderShareSuccessPage(panel);
      break;

    default:
      state.page = 'start';
      renderStartPage(panel);
      break;
  }

  app.appendChild(panel);

  bind();
}

function saveResultFormValues() {
  const noteInput =
    document.querySelector('#note');

  const playerNameInput =
    document.querySelector('#playerName');

  const playDateInput =
    document.querySelector('#playDate');

  const selectedHostInput =
    document.querySelector(
      'input[name="host"]:checked'
    );

  if (noteInput) {
    state.note = noteInput.value;
  }

  if (playerNameInput) {
    state.playerName =
      playerNameInput.value.trim();
  }

  if (playDateInput) {
    state.playDate =
      playDateInput.value;
  }

  if (selectedHostInput) {
    state.selectedHostId =
      selectedHostInput.value;
  }
}

function openShareForm() {
  const noteInput =
    document.querySelector('#note');

  state.note =
    noteInput
      ? noteInput.value
      : state.note;

  if (!state.playDate) {
    state.playDate = todayValue();
  }

  state.page = 'shareForm';

  render();
}

function buildShareMessage() {
  const result = getResult();
  const ranking = result.ranking;
  const top = result.top;
  const host = getSelectedHost();

  const hostName =
    host
      ? host.displayName ||
        host.name ||
        '主持人'
      : '未指定';

  const routeName =
    state.route === 'male'
      ? '男角路線'
      : '女角路線';

  const rankingLines = ranking.map(
    (character, index) => {
      return (
        `${index + 1}. ` +
        `${character.name} ` +
        `${character.pct}%`
      );
    }
  );

  const playerNote =
    state.note.trim() || '無';

  return [
    `【${C.title}｜角色測驗結果】`,
    '',
    `指定主持人：${hostName}`,
    `玩家：${state.playerName}`,
    `遊玩日期：${state.playDate}`,
    `選擇路線：${routeName}`,
    `結果角色：${top.name}`,
    `最高共鳴度：${top.pct}%`,
    '',
    '角色共鳴排行：',
    ...rankingLines,
    '',
    '玩家留言：',
    playerNote
  ].join('\n');
}

function setShareStatus(message) {
  const status =
    document.querySelector('#shareStatus');

  if (status) {
    status.textContent = message;
  }
}

function setShareButtonDisabled(disabled) {
  const button =
    document.querySelector('#sendToLine');

  if (button) {
    button.disabled = disabled;
  }
}

async function ensureLiffReady() {
  if (liffReady) {
    return true;
  }

  setShareStatus('正在連接 LINE…');

  await initLiff();

  if (!liffReady) {
    setShareStatus(
      `LINE 初始化失敗：${
        liffError || '未知錯誤'
      }`
    );

    return false;
  }

  return true;
}

async function ensureLineLogin() {
  if (!window.liff || !liffReady) {
    return false;
  }

  if (window.liff.isLoggedIn()) {
    return true;
  }

  /*
   * 在 LINE App 中通常已經登入。
   * 若由外部瀏覽器開啟，才進入 LINE Login。
   */
  setShareStatus(
    '需要先登入 LINE，登入後會返回目前頁面。'
  );

  window.liff.login({
    redirectUri: window.location.href
  });

  return false;
}

async function sendToLine() {
  saveResultFormValues();

  if (!state.playerName) {
    setShareStatus('請先填寫玩家姓名。');

    document
      .querySelector('#playerName')
      ?.focus();

    return;
  }

  if (!state.playDate) {
    setShareStatus('請先選擇遊玩日期。');

    document
      .querySelector('#playDate')
      ?.focus();

    return;
  }

  if (!state.selectedHostId) {
    setShareStatus('請先選擇主持人。');
    return;
  }

  const selectedHost =
    getSelectedHost();

  if (!selectedHost) {
    setShareStatus(
      '主持人資料不存在，請重新選擇。'
    );

    return;
  }

  const ready =
    await ensureLiffReady();

  if (!ready) {
    return;
  }

  const loggedIn =
    await ensureLineLogin();

  if (!loggedIn) {
    return;
  }

  if (
    !window.liff.isApiAvailable(
      'shareTargetPicker'
    )
  ) {
    setShareStatus(
      '目前環境無法開啟 LINE 分享視窗。請從 LINE App 內開啟這個遊戲。'
    );

    return;
  }

  const message = buildShareMessage();

  setShareButtonDisabled(true);

  setShareStatus(
    `請在 LINE 視窗選擇「${
      selectedHost.displayName ||
      selectedHost.name
    }」的聊天室。`
  );

  try {
    const response =
      await window.liff.shareTargetPicker(
        [
          {
            type: 'text',
            text: message
          }
        ],
        {
          isMultiple: false
        }
      );

    if (response) {
      state.shareCompleted = true;
      state.page = 'shareSuccess';

      render();
      return;
    }

    setShareStatus(
      '你取消了分享，測驗結果仍保留在此頁。'
    );
  } catch (error) {
    console.error(
      'shareTargetPicker 執行失敗',
      error
    );

    const errorMessage =
      error && error.message
        ? error.message
        : '未知錯誤';

    setShareStatus(
      `LINE 分享失敗：${errorMessage}`
    );
  } finally {
    setShareButtonDisabled(false);
  }
}

function answerQuestion(answerIndex) {
  const question =
    C.questions[state.index];

  if (!question) {
    return;
  }

  const selectedAnswer =
    question.a[answerIndex];

  if (!selectedAnswer) {
    return;
  }

  const score = selectedAnswer[1];

  state.answers.push({
    questionIndex: state.index,
    answerIndex,
    question: question.q,
    answer: selectedAnswer[0]
  });

  state.scores = state.scores.map(
    (currentScore, index) => {
      return (
        currentScore +
        (Number(score[index]) || 0)
      );
    }
  );

  state.index += 1;

  if (
    state.index >=
    C.questions.length
  ) {
    cinematic(
      [
        {
          chapter: 'EPILOGUE',
          lines: [
            '所有答案都已沉入玻璃底下。',
            '現在，看看誰在另一端凝視你。'
          ],
          hold: 1200
        }
      ],
      'result'
    );

    return;
  }

  cinematic(
    [
      C.interludes[state.index]
    ],
    'quiz'
  );
}

function restartQuiz() {
  const muted = state.muted;

  state = {
    ...INITIAL_STATE,
    muted
  };

  render();
}

function bind() {
  document
    .querySelector('#startBtn')
    ?.addEventListener(
      'click',
      () => {
        initAudio();

        cinematic(
          C.prologue,
          'route'
        );
      }
    );

  document
    .querySelectorAll('[data-route]')
    .forEach(button => {
      button.addEventListener(
        'click',
        () => {
          state.route =
            button.dataset.route;

          state.index = 0;
          state.scores = [0, 0, 0];
          state.answers = [];
          state.note = '';
          state.playerName = '';
          state.playDate = '';
          state.selectedHostId = '';
          state.shareCompleted = false;

          cinematic(
            [
              C.interludes[0]
            ],
            'quiz'
          );
        }
      );
    });

  document
    .querySelectorAll('[data-answer]')
    .forEach(button => {
      button.addEventListener(
        'click',
        () => {
          const answerIndex =
            Number(
              button.dataset.answer
            );

          answerQuestion(answerIndex);
        }
      );
    });

  document
    .querySelector('#goShare')
    ?.addEventListener(
      'click',
      openShareForm
    );

  document
    .querySelector('#sendToLine')
    ?.addEventListener(
      'click',
      sendToLine
    );

  document
    .querySelector('#backToResult')
    ?.addEventListener(
      'click',
      () => {
        saveResultFormValues();
        state.page = 'result';
        render();
      }
    );

  document
    .querySelector('#shareAgain')
    ?.addEventListener(
      'click',
      () => {
        state.page = 'shareForm';
        render();
      }
    );

  document
    .querySelector('#restart')
    ?.addEventListener(
      'click',
      restartQuiz
    );

  document
    .querySelectorAll(
      'input[name="host"]'
    )
    .forEach(input => {
      input.addEventListener(
        'change',
        () => {
          state.selectedHostId =
            input.value;
        }
      );
    });
}

musicBtn.addEventListener(
  'click',
  toggleAudio
);

/*
 * 背景初始化，不會要求 chat_message.write。
 * 玩家進入遊戲時不會出現聊天室傳送授權。
 */
initLiff();

render();