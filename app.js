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
    questions: (DATA.questions || []).map(
      question => String(question.question || '').trim()
    ),
    answers: [...state.answers]
  };
}

async function postResultToGoogleSheet(payload) {
  const endpoint = getGoogleSheetEndpoint();

  if (!endpoint) {
    throw new Error(
      '尚未設定 Google Apps Script Web App URL'
    );
  }

  /*
   * 不再使用 no-cors 直接送 Google。
   * 改由同網域 Cloudflare Pages Function 代理，
   * 才能確認 Apps Script 是否真的寫入成功。
   */
  const response = await fetch(
    '/api/submit-result',
    {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type':
          'application/json'
      },
      body: JSON.stringify({
        endpoint,
        payload
      })
    }
  );

  const resultData =
    await response.json().catch(
      () => ({})
    );

  if (!response.ok) {
    throw new Error(
      resultData.error ||
      `送出失敗（HTTP ${response.status}）`
    );
  }

  if (resultData.ok !== true) {
    throw new Error(
      resultData.error ||
      'Google Sheet 未確認寫入成功'
    );
  }

  return resultData;
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
  [DATA.index, DATA.global] = await Promise.all([
    loadJson('/data/index.json'),
    loadJson('/data/settings.json')
  ]);
}

function normalizeHexColor(
  value,
  fallback = '#080a0f'
) {
  const color =
    String(value || '').trim();

  return /^#[0-9a-fA-F]{6}$/.test(color)
    ? color
    : fallback;
}

function applyScriptTheme() {
  const theme =
    DATA.setting?.theme || {};

  const colors = {
    '--theme-background': normalizeHexColor(theme.backgroundColor, '#080a0f'),
    '--theme-background-secondary': normalizeHexColor(theme.backgroundSecondaryColor, '#151a25'),
    '--theme-panel': normalizeHexColor(theme.panelColor, '#0d1016'),
    '--theme-card': normalizeHexColor(theme.cardColor, '#0e1117'),
    '--theme-card-hover': normalizeHexColor(theme.cardHoverColor, '#131722'),
    '--theme-title': normalizeHexColor(theme.titleColor, '#f4efe2'),
    '--theme-subtitle': normalizeHexColor(theme.subtitleColor, '#b8b9bf'),
    '--theme-text': normalizeHexColor(theme.textColor, '#d8d9de'),
    '--theme-question': normalizeHexColor(theme.questionColor, '#f1ede4'),
    '--theme-option': normalizeHexColor(theme.optionColor, '#d8d9de'),
    '--theme-muted': normalizeHexColor(theme.mutedColor, '#8e949e'),
    '--theme-accent': normalizeHexColor(theme.accentColor, '#d7c28b'),
    '--theme-accent-secondary': normalizeHexColor(theme.accentSecondaryColor, '#aeb9d7'),
    '--theme-border': normalizeHexColor(theme.borderColor, '#333842'),
    '--theme-button-text': normalizeHexColor(theme.buttonTextColor, '#111318'),
    '--theme-button-background': normalizeHexColor(theme.buttonBackgroundColor, '#d7c28b'),
    '--theme-button-hover': normalizeHexColor(theme.buttonHoverColor, '#f4efe2'),
    '--theme-progress-background': normalizeHexColor(theme.progressBackgroundColor, '#22262d'),
    '--theme-progress': normalizeHexColor(theme.progressColor, '#d7c28b'),
    '--theme-slider-start': normalizeHexColor(theme.sliderStartColor, '#d5c38a'),
    '--theme-slider-middle': normalizeHexColor(theme.sliderMiddleColor, '#aabfac'),
    '--theme-slider-end': normalizeHexColor(theme.sliderEndColor, '#9eacd1'),
    '--theme-slider-thumb': normalizeHexColor(theme.sliderThumbColor, '#f2f4f1'),
    '--theme-best': normalizeHexColor(theme.bestColor, '#d9c993'),
    '--theme-worst': normalizeHexColor(theme.worstColor, '#aeb9d7')
  };

  Object.entries(colors).forEach(
    ([name, value]) => {
      document.documentElement
        .style
        .setProperty(
          name,
          value
        );
    }
  );

  document.body.style.background =
    colors['--theme-background'];

  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute(
      'content',
      colors['--theme-background']
    );
}

async function loadScript(id) {
  const base = `/data/scripts/${id}`;
  [DATA.setting, DATA.story, DATA.questions, DATA.characters] = await Promise.all([
    loadJson(`${base}/settings.json`), loadJson(`${base}/story.json`),
    loadJson(`${base}/questions.json`), loadJson(`${base}/characters.json`)
  ]);
  activeScriptId = id;
  applyScriptTheme();
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

function getInterludeScenes(transitionIndex) {
  const value =
    DATA.story?.interludes?.[transitionIndex];

  /*
   * 新格式：
   * interludes[transitionIndex] = [scene, scene, ...]
   *
   * 舊格式：
   * interludes[transitionIndex] = scene
   *
   * 空值代表該轉場完全沒有動畫。
   */
  if (Array.isArray(value)) {
    return value.filter(
      scene =>
        scene &&
        (
          scene.chapter ||
          Array.isArray(scene.lines)
        )
    );
  }

  if (
    value &&
    typeof value === 'object'
  ) {
    return [value];
  }

  return [];
}

function goToQuizWithInterlude(
  transitionIndex
) {
  const scenes =
    getInterludeScenes(
      transitionIndex
    );

  if (scenes.length === 0) {
    state.page = 'quiz';
    render();
    return;
  }

  cinematic(
    scenes,
    'quiz'
  );
}

function chars(){return DATA.characters?.[state.route]||[]}
function result(){
  const max=Math.max(...state.scores,1);
  const ranking=chars().map((c,i)=>({...c,score:state.scores[i]||0,pct:Math.round((state.scores[i]||0)/max*100)})).sort((a,b)=>b.score-a.score);
  return {ranking,top:ranking[0]};
}

function loadShareImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(
      new Error(`無法載入分享圖片：${src}`)
    );
    image.src = src;
  });
}

function drawCoverImage(
  context,
  image,
  x,
  y,
  width,
  height
) {
  const sourceRatio =
    image.width / image.height;

  const targetRatio =
    width / height;

  let sourceWidth =
    image.width;

  let sourceHeight =
    image.height;

  let sourceX = 0;
  let sourceY = 0;

  if (sourceRatio > targetRatio) {
    sourceWidth =
      image.height * targetRatio;

    sourceX =
      (image.width - sourceWidth) / 2;
  } else {
    sourceHeight =
      image.width / targetRatio;

    sourceY =
      (image.height - sourceHeight) / 2;
  }

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height
  );
}

function wrapCanvasText(
  context,
  text,
  maxWidth
) {
  const normalized =
    String(text || '')
      .replace(/\s+/g, ' ')
      .trim();

  if (!normalized) {
    return [];
  }

  const lines = [];
  let current = '';

  for (const character of normalized) {
    const next =
      current + character;

    if (
      current &&
      context.measureText(next).width >
        maxWidth
    ) {
      lines.push(current);
      current = character;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function hexToRgba(hex, alpha = 1) {
  const normalized = normalizeHexColor(hex, '#000000');
  const value = normalized.slice(1);
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);

  return `rgba(${red},${green},${blue},${alpha})`;
}

function drawRoundedRect(
  context,
  x,
  y,
  width,
  height,
  radius
) {
  const safeRadius = Math.min(
    radius,
    width / 2,
    height / 2
  );

  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(
    x + width,
    y,
    x + width,
    y + height,
    safeRadius
  );
  context.arcTo(
    x + width,
    y + height,
    x,
    y + height,
    safeRadius
  );
  context.arcTo(
    x,
    y + height,
    x,
    y,
    safeRadius
  );
  context.arcTo(
    x,
    y,
    x + width,
    y,
    safeRadius
  );
  context.closePath();
}

function drawCenteredWrappedText(
  context,
  text,
  centerX,
  startY,
  maxWidth,
  lineHeight,
  maxLines = 5
) {
  const lines = wrapCanvasText(
    context,
    text,
    maxWidth
  ).slice(0, maxLines);

  lines.forEach((line, index) => {
    context.fillText(
      line,
      centerX,
      startY + index * lineHeight
    );
  });

  return startY + lines.length * lineHeight;
}

async function createResultShareBlob() {
  const { ranking, top } = result();

  if (!top) {
    throw new Error('找不到角色結果');
  }

  const canvas =
    document.createElement('canvas');

  canvas.width = 1080;
  canvas.height = 1920;

  const context =
    canvas.getContext('2d');

  if (!context) {
    throw new Error('瀏覽器不支援圖片產生');
  }

  const theme =
    DATA.setting?.theme || {};

  const backgroundColor =
    normalizeHexColor(
      theme.backgroundColor,
      '#f6f2e8'
    );

  const panelColor =
    normalizeHexColor(
      theme.panelColor,
      '#fffaf0'
    );

  const titleColor =
    normalizeHexColor(
      theme.titleColor,
      '#211c19'
    );

  const textColor =
    normalizeHexColor(
      theme.textColor,
      '#332c27'
    );

  const mutedColor =
    normalizeHexColor(
      theme.mutedColor,
      '#776b61'
    );

  const accentColor =
    normalizeHexColor(
      theme.accentColor,
      '#8e1818'
    );

  const borderColor =
    normalizeHexColor(
      theme.borderColor,
      accentColor
    );

  context.fillStyle = backgroundColor;
  context.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  const paperGradient =
    context.createRadialGradient(
      540,
      300,
      20,
      540,
      900,
      1000
    );

  paperGradient.addColorStop(
    0,
    hexToRgba(panelColor, .96)
  );

  paperGradient.addColorStop(
    1,
    hexToRgba(backgroundColor, .96)
  );

  context.fillStyle = paperGradient;
  context.fillRect(
    0,
    0,
    1080,
    1920
  );

  const margin = 92;
  const contentWidth = 896;

  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.fillStyle = titleColor;
  context.font =
    '500 48px "Noto Serif TC", serif';

  const preface =
    DATA.setting?.result
      ?.shareImagePreface ||
    DATA.setting?.result
      ?.imagePreface ||
    `在${DATA.setting.title || DATA.setting.name || '故事'}的世界裡你是`;

  let cursorY = 100;

  cursorY = drawCenteredWrappedText(
    context,
    preface,
    540,
    cursorY,
    850,
    62,
    3
  ) + 26;

  const imageX = 150;
  const imageY = cursorY;
  const imageWidth = 780;
  const imageHeight = 690;

  context.strokeStyle = borderColor;
  context.lineWidth = 5;
  context.strokeRect(
    imageX,
    imageY,
    imageWidth,
    imageHeight
  );

  try {
    const image =
      await loadShareImage(top.image);

    drawCoverImage(
      context,
      image,
      imageX + 8,
      imageY + 8,
      imageWidth - 16,
      imageHeight - 16
    );
  } catch (error) {
    console.warn(
      '分享圖角色圖片載入失敗',
      error
    );

    context.fillStyle =
      hexToRgba(panelColor, .7);

    context.fillRect(
      imageX + 8,
      imageY + 8,
      imageWidth - 16,
      imageHeight - 16
    );

    context.fillStyle = mutedColor;
    context.font =
      '400 44px "Noto Serif TC", serif';
    context.fillText(
      '角色圖片',
      540,
      imageY + imageHeight / 2
    );
  }

  cursorY = imageY + imageHeight + 76;

  context.fillStyle = titleColor;
  context.font =
    '700 70px "Noto Serif TC", serif';
  context.fillText(
    top.name || '',
    540,
    cursorY
  );

  cursorY += 70;

  if (top.kr) {
    context.fillStyle = mutedColor;
    context.font =
      '400 34px "Noto Serif TC", serif';
    context.fillText(
      top.kr,
      540,
      cursorY
    );
    cursorY += 50;
  }

  context.fillStyle = textColor;
  context.font =
    '400 31px "Noto Serif TC", serif';

  cursorY = drawCenteredWrappedText(
    context,
    top.description ||
      top.desc ||
      '',
    540,
    cursorY,
    820,
    46,
    4
  ) + 34;

  const rankingHeight =
    105 + ranking.length * 58;

  const rankingY = Math.min(
    cursorY,
    1880 - rankingHeight
  );

  context.strokeStyle = borderColor;
  context.lineWidth = 4;
  context.fillStyle =
    hexToRgba(panelColor, .72);

  drawRoundedRect(
    context,
    margin,
    rankingY,
    contentWidth,
    rankingHeight,
    2
  );
  context.fill();
  context.stroke();

  context.fillStyle = accentColor;
  context.font =
    '600 42px "Noto Serif TC", serif';
  context.fillText(
    DATA.setting?.result
      ?.resonanceLabel ||
      '靈魂共鳴度',
    540,
    rankingY + 64
  );

  ranking.forEach((character, index) => {
    const rowY =
      rankingY + 110 + index * 58;

    context.textAlign = 'left';
    context.fillStyle = textColor;
    context.font =
      '400 28px "Noto Serif TC", serif';
    context.fillText(
      character.name || '',
      145,
      rowY
    );

    const barX = 305;
    const barWidth = 515;
    const barHeight = 17;

    context.fillStyle =
      hexToRgba(mutedColor, .18);

    drawRoundedRect(
      context,
      barX,
      rowY - 16,
      barWidth,
      barHeight,
      9
    );
    context.fill();

    context.fillStyle =
      index === 0
        ? accentColor
        : hexToRgba(accentColor, .72);

    drawRoundedRect(
      context,
      barX,
      rowY - 16,
      Math.max(
        8,
        barWidth *
          Math.max(
            0,
            Math.min(
              100,
              Number(character.pct || 0)
            )
          ) /
          100
      ),
      barHeight,
      9
    );
    context.fill();

    context.textAlign = 'right';
    context.fillStyle = titleColor;
    context.font =
      '600 28px sans-serif';
    context.fillText(
      `${character.pct}%`,
      930,
      rowY
    );
  });

  return new Promise(
    (resolve, reject) => {
      canvas.toBlob(
        blob => {
          if (blob) {
            resolve(blob);
          } else {
            reject(
              new Error('圖片產生失敗')
            );
          }
        },
        'image/png',
        1
      );
    }
  );
}

function resultImageFileName() {
  const { top } = result();

  const safeName =
    String(
      top?.name ||
      'result'
    )
      .replace(
        /[\\/:*?"<>|]/g,
        '-'
      );

  const safeScript =
    String(
      DATA.setting.title ||
      DATA.setting.name ||
      'Assign-Roles'
    )
      .replace(
        /[\\/:*?"<>|]/g,
        '-'
      );

  return (
    `${safeScript}_${safeName}.png`
  );
}

function isMobileDevice() {
  return (
    /Android|iPhone|iPad|iPod/i.test(
      navigator.userAgent
    ) ||
    (
      navigator.maxTouchPoints > 1 &&
      window.matchMedia(
        '(max-width: 900px)'
      ).matches
    )
  );
}

async function saveResultImage() {
  const button =
    document.querySelector(
      '#saveResultImage'
    );

  const mobile =
    isMobileDevice();

  if (button) {
    button.disabled = true;
    button.textContent =
      '圖片產生中…';
  }

  try {
    const blob =
      await createResultShareBlob();

    const file =
      new File(
        [blob],
        resultImageFileName(),
        {
          type: 'image/png'
        }
      );

    if (
      mobile &&
      navigator.share &&
      navigator.canShare?.({
        files: [file]
      })
    ) {
      await navigator.share({
        files: [file],
        title: '儲存測驗結果圖片',
        text:
          '請在分享選單中選擇「儲存影像」或相簿應用程式。'
      });

      return;
    }

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement('a');

    link.href = url;
    link.download =
      resultImageFileName();

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(
      () =>
        URL.revokeObjectURL(url),
      1500
    );

    if (mobile) {
      window.alert(
        '此瀏覽器無法開啟相簿儲存選單，圖片已下載。請從下載項目將圖片存入相簿。'
      );
    }
  } catch (error) {
    if (
      error?.name !==
      'AbortError'
    ) {
      console.error(error);

      window.alert(
        error?.message ||
        '圖片產生失敗'
      );
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = '存成圖片';
    }
  }
}

async function downloadResultImage() {
  const button =
    document.querySelector(
      '#saveResultImage'
    );

  if (button) {
    button.disabled = true;
    button.textContent =
      '圖片產生中…';
  }

  try {
    const blob =
      await createResultShareBlob();

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement('a');

    link.href = url;
    link.download =
      resultImageFileName();

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(
      () =>
        URL.revokeObjectURL(url),
      1500
    );
  } catch (error) {
    console.error(error);

    window.alert(
      error?.message ||
      '圖片產生失敗'
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent =
        '存成圖片';
    }
  }
}

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
                最符合
              </button>

              <button
                class="choice-mark least"
                data-least="${index}"
                type="button"
              >
                最不符合
              </button>
            </div>
          </div>
        `).join('')}
      </div>

      <p class="question-hint" id="questionHint">
        請各選一個最符合與最不符合的選項，兩者不能相同。
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
      <div class="quiz-nav">
        <button
          class="quiz-back"
          id="previousQuestion"
          type="button"
        >
          ‹ 上一題
        </button>

        <div class="qnum">
          QUESTION ${String(state.index + 1).padStart(2, '0')}
          /
          ${String(DATA.questions.length).padStart(2, '0')}
        </div>
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
  <div class="actions result-share-actions">
  <button class="btn" id="goShare">${esc(s.shareButton)}</button>
  <button class="ghost" id="saveResultImage">存成圖片</button>
  <button class="ghost" id="restart">${esc(s.restartButton)}</button></div>`;
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

    <div class="note">
      <label for="note">
        ${esc(shareSetting.noteLabel || '玩家留言 MESSAGE')}
      </label>
      <textarea
        id="note"
        maxlength="1000"
        placeholder="${esc(DATA.setting.result?.notePlaceholder || '可以留下想說的話')}"
      >${esc(state.note)}</textarea>
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

function scoreContributionForAnswer(record) {
  const question =
    DATA.questions?.[
      Number(record?.questionIndex)
    ];

  if (!question || !record) {
    return [0, 0, 0];
  }

  const type =
    record.type ||
    question.type ||
    'single';

  if (type === 'bestWorst') {
    const most =
      question.answers?.[
        Number(record.mostIndex)
      ];

    const least =
      question.answers?.[
        Number(record.leastIndex)
      ];

    return [0, 1, 2].map(index =>
      Number(
        (
          most?.mostScore ||
          most?.score ||
          []
        )[index] || 0
      ) +
      Number(
        (
          least?.leastScore ||
          []
        )[index] || 0
      )
    );
  }

  if (type === 'slider') {
    const slider =
      question.slider || {};

    const min =
      Number(slider.min ?? 0);

    const max =
      Number(slider.max ?? 100);

    const value =
      Number(record.value ?? min);

    const ratio =
      max === min
        ? 0
        : Math.max(
            0,
            Math.min(
              1,
              (value - min) /
                (max - min)
            )
          );

    const minScore =
      slider.minScore || [0, 0, 0];

    const maxScore =
      slider.maxScore || [0, 0, 0];

    return [0, 1, 2].map(index => {
      const low =
        Number(minScore[index] || 0);

      const high =
        Number(maxScore[index] || 0);

      return low +
        (high - low) * ratio;
    });
  }

  const answer =
    question.answers?.[
      Number(record.answerIndex)
    ];

  return [0, 1, 2].map(index =>
    Number(answer?.score?.[index] || 0)
  );
}

function rebuildScoresFromAnswers() {
  state.scores = [0, 0, 0];

  state.answers.forEach(record => {
    const contribution =
      scoreContributionForAnswer(record);

    state.scores =
      state.scores.map(
        (score, index) =>
          score +
          Number(
            contribution[index] || 0
          )
      );
  });
}

function goToPreviousQuestion() {
  if (state.index <= 0) {
    state.answers = [];
    state.scores = [0, 0, 0];
    state.route = null;
    state.page = 'route';
    render();
    return;
  }

  const previousIndex =
    state.index - 1;

  state.answers =
    state.answers.filter(
      answerRecord =>
        Number(
          answerRecord.questionIndex
        ) < previousIndex
    );

  state.index = previousIndex;
  rebuildScoresFromAnswers();
  state.page = 'quiz';
  render();
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
    goToQuizWithInterlude(
      state.index
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

  state.note =
    document.querySelector('#note')?.value.trim() || '';
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
  document.querySelector('#previousQuestion')?.addEventListener('click',goToPreviousQuestion);
  document.querySelectorAll('[data-route]').forEach(b=>b.onclick=()=>{state.route=b.dataset.route;state.index=0;state.scores=[0,0,0];goToQuizWithInterlude(0)});
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
        '最符合和最不符合不能選同一個選項。';
    } else if (hint) {
      hint.textContent =
        '請各選一個最符合與最不符合的選項，兩者不能相同。';
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

  document.querySelector('#goShare')?.addEventListener('click',()=>{state.page='share';render()});
  document.querySelector('#saveResultImage')?.addEventListener('click',saveResultImage);
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
