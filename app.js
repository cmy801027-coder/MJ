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

function getTextStyle(styleKey) {
  return (
    DATA.setting?.textStyles?.[styleKey] ||
    {}
  );
}

function textStyleCss(styleKey) {
  const style =
    getTextStyle(styleKey);

  const declarations = [];

  const fontMap = {
    notoSerif:
      '"Noto Serif TC", serif',
    notoSans:
      '"Noto Sans TC", sans-serif',
    lxgwWenkai:
      '"LXGW WenKai TC", cursive',
    shipporiMincho:
      '"Shippori Mincho B1", serif',
    zenMaru:
      '"Zen Maru Gothic", sans-serif',
    kosugiMaru:
      '"Kosugi Maru", sans-serif',
    maShanZheng:
      '"Ma Shan Zheng", cursive',
    zcoolXiaoWei:
      '"ZCOOL XiaoWei", serif',
    longCang:
      '"Long Cang", cursive',
    liuJian:
      '"Liu Jian Mao Cao", cursive',
    serif:
      'serif',
    sans:
      'sans-serif',
    mono:
      'monospace',
    cursive:
      'cursive'
  };

  if (style.fontFamily) {
    declarations.push(
      `font-family:${
        fontMap[style.fontFamily] ||
        fontMap.notoSerif
      }`
    );
  }

  const fontSize =
    Number(style.fontSize);

  if (
    Number.isFinite(fontSize) &&
    fontSize >= 8 &&
    fontSize <= 160
  ) {
    declarations.push(
      `font-size:${fontSize}px`
    );
  }

  if (
    /^#[0-9a-fA-F]{6}$/.test(
      String(style.color || '')
    )
  ) {
    declarations.push(
      `color:${style.color}`
    );
  }

  declarations.push(
    `font-weight:${
      style.bold ? '700' : 'inherit'
    }`
  );

  declarations.push(
    `font-style:${
      style.italic
        ? 'italic'
        : 'normal'
    }`
  );

  declarations.push(
    `text-decoration:${
      style.underline
        ? 'underline'
        : 'none'
    }`
  );

  return declarations.join(';');
}

function styledText(
  value,
  styleKey,
  tagName = 'span'
) {
  const style =
    getTextStyle(styleKey);

  const animation =
    ['fade', 'typewriter'].includes(
      style.animation
    )
      ? style.animation
      : '';

  const duration =
    Math.max(
      200,
      Math.min(
        10000,
        Number(style.animationDuration) ||
        (
          animation === 'typewriter'
            ? 45
            : 900
        )
      )
    );

  return (
    `<${tagName} ` +
    `data-text-style="${esc(styleKey)}" ` +
    `data-text-animation="${esc(animation)}" ` +
    `data-animation-duration="${duration}" ` +
    `style="${esc(textStyleCss(styleKey))}">` +
    `${esc(value)}` +
    `</${tagName}>`
  );
}

function styledLines(
  lines,
  styleKey,
  tagName = 'p'
) {
  return (
    (lines || [])
      .map(
        line =>
          styledText(
            line,
            styleKey,
            tagName
          )
      )
      .join('')
  );
}

function runTextAnimations(root = document) {
  root
    .querySelectorAll(
      '[data-text-animation]:not([data-animation-ready])'
    )
    .forEach(element => {
      element.dataset.animationReady =
        'true';

      const animation =
        element.dataset.textAnimation;

      const duration =
        Number(
          element.dataset.animationDuration
        ) || 900;

      if (animation === 'fade') {
        element.style.setProperty(
          '--text-animation-duration',
          `${duration}ms`
        );

        element.classList.add(
          'text-animation-fade'
        );

        requestAnimationFrame(() => {
          element.classList.add(
            'is-visible'
          );
        });

        return;
      }

      if (animation !== 'typewriter') {
        return;
      }

      const originalText =
        element.textContent || '';

      element.textContent = '';
      element.classList.add(
        'text-animation-typewriter'
      );

      const characterDelay =
        Math.max(
          12,
          Math.min(
            300,
            duration
          )
        );

      let index = 0;

      const timer =
        window.setInterval(
          () => {
            element.textContent =
              originalText.slice(
                0,
                index + 1
              );

            index += 1;

            if (
              index >=
              originalText.length
            ) {
              window.clearInterval(
                timer
              );

              element.classList.add(
                'is-complete'
              );
            }
          },
          characterDelay
        );
    });
}

function canvasTextStyle(
  context,
  styleKey,
  defaults = {}
) {
  const style =
    getTextStyle(styleKey);

  const fontMap = {
    notoSerif:
      '"Noto Serif TC", serif',
    notoSans:
      '"Noto Sans TC", sans-serif',
    lxgwWenkai:
      '"LXGW WenKai TC", cursive',
    shipporiMincho:
      '"Shippori Mincho B1", serif',
    zenMaru:
      '"Zen Maru Gothic", sans-serif',
    kosugiMaru:
      '"Kosugi Maru", sans-serif',
    maShanZheng:
      '"Ma Shan Zheng", cursive',
    zcoolXiaoWei:
      '"ZCOOL XiaoWei", serif',
    longCang:
      '"Long Cang", cursive',
    liuJian:
      '"Liu Jian Mao Cao", cursive',
    serif:
      'serif',
    sans:
      'sans-serif',
    mono:
      'monospace',
    cursive:
      'cursive'
  };

  const size =
    Number(style.fontSize) ||
    Number(defaults.fontSize) ||
    34;

  const weight =
    style.bold
      ? 700
      : defaults.fontWeight || 400;

  const italic =
    style.italic
      ? 'italic '
      : '';

  const family =
    fontMap[style.fontFamily] ||
    defaults.fontFamily ||
    '"Noto Serif TC", serif';

  context.font =
    `${italic}${weight} ${size}px ${family}`;

  context.fillStyle =
    (
      /^#[0-9a-fA-F]{6}$/.test(
        String(style.color || '')
      )
        ? style.color
        : defaults.color
    ) || '#d8d9de';

  return {
    underline:
      style.underline === true,
    fontSize: size
  };
}

function fillStyledCanvasText(
  context,
  text,
  x,
  y,
  styleKey,
  defaults = {}
) {
  const applied =
    canvasTextStyle(
      context,
      styleKey,
      defaults
    );

  context.fillText(
    String(text || ''),
    x,
    y
  );

  if (
    applied.underline &&
    String(text || '')
  ) {
    const metrics =
      context.measureText(
        String(text)
      );

    const startX =
      context.textAlign === 'center'
        ? x - metrics.width / 2
        : context.textAlign === 'right'
          ? x - metrics.width
          : x;

    context.beginPath();
    context.moveTo(
      startX,
      y + applied.fontSize * 0.12
    );
    context.lineTo(
      startX + metrics.width,
      y + applied.fontSize * 0.12
    );
    context.lineWidth =
      Math.max(
        1,
        applied.fontSize / 24
      );
    context.strokeStyle =
      context.fillStyle;
    context.stroke();
  }
}

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

async function cinematic(items,next,stylePrefix='story.scenes'){
  if(transitionLocked)return; transitionLocked=true;
  app.innerHTML='<section class="cinema-stage"></section>'; const stage=app.firstElementChild;
  for(const [itemIndex,item] of (items||[]).entries()){
    stage.classList.remove('visible'); await sleep(350);
    stage.innerHTML=`${item.chapter?`<div class="chapter">${styledText(item.chapter,`${stylePrefix}.${itemIndex}.chapter`)}</div>`:''}
      <div class="story-lines">${styledLines(item.lines||[],`${stylePrefix}.${itemIndex}.lines`)}</div>
      <div class="continue-hint">點擊畫面繼續</div>`;
    runTextAnimations(stage);
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
    'quiz',
    `story.interludes.${transitionIndex}`
  );
}

function chars(){
  return (
    DATA.characters?.[state.route] || []
  ).map(
    (character, index) => ({
      ...character,
      _sourceIndex: index
    })
  );
}
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

function drawContainImage(
  context,
  image,
  x,
  y,
  width,
  height,
  backgroundColor
) {
  context.fillStyle =
    backgroundColor;

  context.fillRect(
    x,
    y,
    width,
    height
  );

  const scale =
    Math.min(
      width / image.width,
      height / image.height
    );

  const drawWidth =
    image.width * scale;

  const drawHeight =
    image.height * scale;

  const drawX =
    x + (width - drawWidth) / 2;

  const drawY =
    y + (height - drawHeight) / 2;

  context.drawImage(
    image,
    drawX,
    drawY,
    drawWidth,
    drawHeight
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

  const theme =
    DATA.setting?.theme || {};

  const backgroundColor =
    normalizeHexColor(
      theme.backgroundColor,
      '#080a0f'
    );

  const panelColor =
    normalizeHexColor(
      theme.panelColor,
      '#10131a'
    );

  const titleColor =
    normalizeHexColor(
      theme.titleColor,
      '#f4efe2'
    );

  const textColor =
    normalizeHexColor(
      theme.textColor,
      '#d8d9de'
    );

  const mutedColor =
    normalizeHexColor(
      theme.mutedColor,
      '#8e949e'
    );

  const accentColor =
    normalizeHexColor(
      theme.accentColor,
      '#d7c28b'
    );

  /*
   * 先用量測 Canvas 計算實際內容高度，
   * 再建立最後輸出的 Canvas。
   */
  const measureCanvas =
    document.createElement('canvas');

  measureCanvas.width = 1080;
  measureCanvas.height = 100;

  const measureContext =
    measureCanvas.getContext('2d');

  if (!measureContext) {
    throw new Error('瀏覽器不支援圖片產生');
  }

  const preface =
    String(
      DATA.setting?.resultShare?.preface ||
      DATA.setting?.shareImage?.preface ||
      '你的角色結果是'
    ).trim();

  measureContext.font =
    '500 38px "Noto Serif TC", serif';

  const prefaceLines =
    wrapCanvasText(
      measureContext,
      preface,
      850
    ).slice(0, 4);

  measureContext.font =
    '400 34px "Noto Serif TC", serif';

  const descriptionLines =
    wrapCanvasText(
      measureContext,
      top.description ||
      top.desc ||
      '',
      820
    ).slice(0, 10);

  const topPadding = 70;
  const prefaceLineHeight = 76;
  const prefaceBottomGap = 42;

  const imageWidth = 840;
  const imageHeight = 840;
  const imageBottomGap = 172;

  const roleNameHeight = 86;
  const subtitleHeight =
    top.kr ? 68 : 18;

  const descriptionLineHeight = 62;
  const descriptionBottomGap = 58;

  const rankingHeaderHeight = 62;
  const rankingRowHeight = 61;
  const rankingTopPadding = 32;
  const rankingBottomPadding = 36;

  const rankingHeight =
    rankingTopPadding +
    rankingHeaderHeight +
    ranking.length * rankingRowHeight +
    rankingBottomPadding;

  const bottomPadding = 44;

  const prefaceHeight =
    prefaceLines.length *
      prefaceLineHeight +
    prefaceBottomGap;

  const descriptionHeight =
    Math.max(
      descriptionLineHeight,
      descriptionLines.length *
        descriptionLineHeight
    ) +
    descriptionBottomGap;

  const finalHeight =
    topPadding +
    prefaceHeight +
    imageHeight +
    imageBottomGap +
    roleNameHeight +
    subtitleHeight +
    descriptionHeight +
    rankingHeight +
    bottomPadding;

  const canvas =
    document.createElement('canvas');

  canvas.width = 1080;
  canvas.height =
    Math.max(
      1500,
      Math.ceil(finalHeight)
    );

  const context =
    canvas.getContext('2d');

  if (!context) {
    throw new Error('瀏覽器不支援圖片產生');
  }

  /*
   * 背景。
   */
  const gradient =
    context.createLinearGradient(
      0,
      0,
      0,
      canvas.height
    );

  gradient.addColorStop(
    0,
    panelColor
  );

  gradient.addColorStop(
    0.55,
    backgroundColor
  );

  gradient.addColorStop(
    1,
    panelColor
  );

  context.fillStyle = gradient;

  context.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  let cursorY =
    topPadding;

  /*
   * 成果前言。
   */
  context.textAlign =
    'center';

  context.fillStyle =
    textColor;

  canvasTextStyle(
    context,
    'settings.result.shareImagePreface',
    {
      fontSize: 38,
      fontWeight: 500,
      fontFamily:
        '"Noto Serif TC", serif',
      color: textColor
    }
  );

  prefaceLines.forEach(
    (line, index) => {
      fillStyledCanvasText(
        context,
        line,
        540,
        cursorY +
          index *
            prefaceLineHeight,
        'settings.result.shareImagePreface',
        {
          fontSize: 38,
          fontWeight: 500,
          fontFamily:
            '"Noto Serif TC", serif',
          color: textColor
        }
      );
    }
  );

  cursorY +=
    prefaceHeight;

  /*
   * 角色圖片。
   * 完整比例、無外框。
   */
  const imageX =
    (canvas.width -
      imageWidth) / 2;

  const imageY =
    cursorY;

  try {
    const image =
      await loadShareImage(
        top.image
      );

    drawContainImage(
      context,
      image,
      imageX,
      imageY,
      imageWidth,
      imageHeight,
      panelColor
    );
  } catch (error) {
    console.warn(
      '分享圖角色圖片載入失敗',
      error
    );

    context.fillStyle =
      panelColor;

    context.fillRect(
      imageX,
      imageY,
      imageWidth,
      imageHeight
    );

    context.fillStyle =
      mutedColor;

    context.font =
      '400 30px "Noto Serif TC", serif';

    context.fillText(
      '角色圖片載入失敗',
      540,
      imageY +
        imageHeight / 2
    );
  }

  cursorY =
    imageY +
    imageHeight +
    imageBottomGap;

  /*
   * 角色名稱。
   */
  context.fillStyle =
    titleColor;

  fillStyledCanvasText(
    context,
    top.name || '',
    540,
    cursorY,
    `characters.${state.route}.${top._sourceIndex ?? 0}.name`,
    {
      fontSize: 82,
      fontWeight: 700,
      fontFamily:
        '"Noto Serif TC", serif',
      color: titleColor
    }
  );

  cursorY +=
    roleNameHeight;

  /*
   * 角色副標。
   */
  if (top.kr) {
    context.fillStyle =
      mutedColor;

    fillStyledCanvasText(
      context,
      top.kr,
      540,
      cursorY,
      `characters.${state.route}.${top._sourceIndex ?? 0}.kr`,
      {
        fontSize: 32,
        fontWeight: 400,
        fontFamily:
          '"Noto Serif TC", serif',
        color: mutedColor
      }
    );

    cursorY +=
      subtitleHeight;
  } else {
    cursorY +=
      subtitleHeight;
  }

  /*
   * 角色介紹。
   */
  context.textAlign =
    'left';

  context.fillStyle =
    textColor;

  descriptionLines.forEach(
    (line, index) => {
      fillStyledCanvasText(
        context,
        line,
        130,
        cursorY +
          index *
            descriptionLineHeight,
        `characters.${state.route}.${top._sourceIndex ?? 0}.description`,
        {
          fontSize: 34,
          fontWeight: 400,
          fontFamily:
            '"Noto Serif TC", serif',
          color: textColor
        }
      );
    }
  );

  cursorY +=
    descriptionHeight;

  /*
   * 靈魂共鳴度。
   */
  const rankingX = 110;
  const rankingWidth = 860;
  const rankingY =
    cursorY;

  context.fillStyle =
    panelColor;

  context.fillRect(
    rankingX,
    rankingY,
    rankingWidth,
    rankingHeight
  );

  context.strokeStyle =
    accentColor;

  context.lineWidth = 2;

  context.strokeRect(
    rankingX,
    rankingY,
    rankingWidth,
    rankingHeight
  );

  context.textAlign =
    'center';

  context.fillStyle =
    accentColor;

  context.font =
    '600 30px "Noto Serif TC", serif';

  context.fillText(
    '靈魂共鳴度',
    540,
    rankingY + 58
  );

  ranking.forEach(
    (character, index) => {
      const rowY =
        rankingY +
        104 +
        index *
          rankingRowHeight;

      const labelX =
        rankingX + 46;

      const barX =
        rankingX + 210;

      const barWidth =
        520;

      const percentX =
        rankingX +
        rankingWidth -
        48;

      context.textAlign =
        'left';

      context.fillStyle =
        textColor;

      context.font =
        '400 27px "Noto Serif TC", serif';

      context.fillText(
        character.name || '',
        labelX,
        rowY
      );

      context.fillStyle =
        mutedColor;

      context.fillRect(
        barX,
        rowY - 11,
        barWidth,
        4
      );

      context.fillStyle =
        accentColor;

      context.fillRect(
        barX,
        rowY - 11,
        barWidth *
          Math.max(
            0,
            Math.min(
              100,
              Number(
                character.pct || 0
              )
            )
          ) /
          100,
        4
      );

      context.textAlign =
        'right';

      context.fillStyle =
        titleColor;

      context.font =
        '600 25px "Noto Serif TC", serif';

      context.fillText(
        `${character.pct || 0}%`,
        percentX,
        rowY
      );
    }
  );

  return new Promise(
    (resolve, reject) => {
      canvas.toBlob(
        blob => {
          if (blob) {
            resolve(blob);
          } else {
            reject(
              new Error(
                '圖片產生失敗'
              )
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
  p.innerHTML=`<div class="eyebrow">${styledText(DATA.setting.subtitle,'settings.subtitle')}</div><h1 class="title">${styledText(DATA.setting.title||DATA.setting.name,'settings.title')}</h1>
  <div class="opening-quote">${styledLines(DATA.story.opening.quote,'story.opening.quote')}</div>
  <button class="btn" id="startBtn">${styledText(DATA.story.opening.button||'開始','story.opening.button')}</button>`;
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
              <strong>${styledText(answer.text,`questions.${state.index}.answers.${index}.text`)}</strong>
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
          <span>${styledText(slider.leftLabel || '偏左',`questions.${state.index}.slider.leftLabel`)}</span>
          <span>${styledText(slider.centerLabel || '彼此平衡',`questions.${state.index}.slider.centerLabel`)}</span>
          <span>${styledText(slider.rightLabel || '偏右',`questions.${state.index}.slider.rightLabel`)}</span>
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
            <span>${styledText(answer.text,`questions.${state.index}.answers.${index}.text`)}</span>
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
  <div class="result-name"><h1>${styledText(top.name,`characters.${state.route}.${top._sourceIndex ?? 0}.name`)}</h1><p>${styledText(top.kr||'',`characters.${state.route}.${top._sourceIndex ?? 0}.kr`)}</p></div></div><p class="desc">${styledText(top.description||top.desc||'',`characters.${state.route}.${top._sourceIndex ?? 0}.description`)}</p>
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
  app.appendChild(p);
  bind();
  runTextAnimations(p);
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
      'result',
      'story.epilogue'
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
  document.querySelector('#startBtn')?.addEventListener('click',()=>{initAudio();cinematic(DATA.story.prologue,'route','story.prologue')});
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
