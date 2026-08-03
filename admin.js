'use strict';

const S={tab:'scripts',data:null,scriptId:null,dirty:false};
const $=s=>document.querySelector(s), esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const THEME_PRESETS={
  horror:{
    label:'恐怖',backgroundColor:'#080607',backgroundSecondaryColor:'#1a090d',panelColor:'#12090c',cardColor:'#170c10',cardHoverColor:'#241016',titleColor:'#f0d9d9',subtitleColor:'#ad777d',textColor:'#d7c6c8',questionColor:'#ffd9dd',optionColor:'#d7c6c8',mutedColor:'#80666b',accentColor:'#a9132b',accentSecondaryColor:'#5f1b29',borderColor:'#4a2029',buttonTextColor:'#fff1f2',buttonBackgroundColor:'#8f1125',buttonHoverColor:'#c61d38',progressBackgroundColor:'#2b151a',progressColor:'#b71730',sliderStartColor:'#42131c',sliderMiddleColor:'#85182a',sliderEndColor:'#d43b50',sliderThumbColor:'#f2d9dd',bestColor:'#c11b37',worstColor:'#5b1523'
  },
  school:{
    label:'校園',backgroundColor:'#f2f7fb',backgroundSecondaryColor:'#dbeaf5',panelColor:'#ffffff',cardColor:'#f9fcff',cardHoverColor:'#e9f4fb',titleColor:'#24445f',subtitleColor:'#66849b',textColor:'#40596d',questionColor:'#173e5d',optionColor:'#355870',mutedColor:'#8197a7',accentColor:'#5da9d6',accentSecondaryColor:'#f0ad5d',borderColor:'#bcd3e2',buttonTextColor:'#ffffff',buttonBackgroundColor:'#4f9dcc',buttonHoverColor:'#317fae',progressBackgroundColor:'#d5e6f1',progressColor:'#58a6d3',sliderStartColor:'#8cc6e7',sliderMiddleColor:'#a8d8c7',sliderEndColor:'#f0bd7d',sliderThumbColor:'#ffffff',bestColor:'#5da9d6',worstColor:'#f0ad5d'
  },
  cinema:{
    label:'電影',backgroundColor:'#090909',backgroundSecondaryColor:'#1b1b1b',panelColor:'#111111',cardColor:'#171717',cardHoverColor:'#222222',titleColor:'#f5f0e6',subtitleColor:'#b8ad99',textColor:'#d8d1c5',questionColor:'#fff8ea',optionColor:'#d6cec0',mutedColor:'#81796c',accentColor:'#c8a35f',accentSecondaryColor:'#7e1d25',borderColor:'#3d3932',buttonTextColor:'#111111',buttonBackgroundColor:'#d1ad66',buttonHoverColor:'#ead09a',progressBackgroundColor:'#28251f',progressColor:'#c8a35f',sliderStartColor:'#8b6f3d',sliderMiddleColor:'#c8a35f',sliderEndColor:'#ead09a',sliderThumbColor:'#fff6df',bestColor:'#d0ae69',worstColor:'#87252c'
  },
  cyberpunk:{
    label:'Cyberpunk',backgroundColor:'#050611',backgroundSecondaryColor:'#11152b',panelColor:'#0a0d1c',cardColor:'#0e1226',cardHoverColor:'#171d3a',titleColor:'#f6f4ff',subtitleColor:'#7df9ff',textColor:'#c8c7e8',questionColor:'#fff0ff',optionColor:'#d2d0ff',mutedColor:'#777aa5',accentColor:'#00f5ff',accentSecondaryColor:'#ff2bd6',borderColor:'#26325e',buttonTextColor:'#040513',buttonBackgroundColor:'#00f5ff',buttonHoverColor:'#ff2bd6',progressBackgroundColor:'#151a35',progressColor:'#00f5ff',sliderStartColor:'#00f5ff',sliderMiddleColor:'#7a5cff',sliderEndColor:'#ff2bd6',sliderThumbColor:'#ffffff',bestColor:'#00f5ff',worstColor:'#ff2bd6'
  },
  warm:{
    label:'暖色',backgroundColor:'#241713',backgroundSecondaryColor:'#40261e',panelColor:'#2e1d18',cardColor:'#36221c',cardHoverColor:'#4a2d23',titleColor:'#fff0db',subtitleColor:'#d9aa7c',textColor:'#ecd8c5',questionColor:'#ffe5ca',optionColor:'#ead1bb',mutedColor:'#a68169',accentColor:'#dc8b4d',accentSecondaryColor:'#c45e4c',borderColor:'#644235',buttonTextColor:'#28150f',buttonBackgroundColor:'#e49a58',buttonHoverColor:'#ffc27f',progressBackgroundColor:'#513128',progressColor:'#e49a58',sliderStartColor:'#c85f4b',sliderMiddleColor:'#e49a58',sliderEndColor:'#f2c879',sliderThumbColor:'#fff1dc',bestColor:'#e49a58',worstColor:'#c85f4b'
  },
  blackGold:{
    label:'黑金',backgroundColor:'#080909',backgroundSecondaryColor:'#171510',panelColor:'#10100e',cardColor:'#15140f',cardHoverColor:'#211e14',titleColor:'#f5e8bd',subtitleColor:'#b8a46f',textColor:'#d8cfb5',questionColor:'#fff2c7',optionColor:'#dbd0af',mutedColor:'#80765b',accentColor:'#d3b45f',accentSecondaryColor:'#8c6b24',borderColor:'#443a20',buttonTextColor:'#11100c',buttonBackgroundColor:'#d3b45f',buttonHoverColor:'#f0d483',progressBackgroundColor:'#282316',progressColor:'#d3b45f',sliderStartColor:'#80631f',sliderMiddleColor:'#c49d3d',sliderEndColor:'#f0d483',sliderThumbColor:'#fff4cc',bestColor:'#d9bd69',worstColor:'#8c6b24'
  },
  palace:{
    label:'宮廷',backgroundColor:'#180e18',backgroundSecondaryColor:'#331a2d',panelColor:'#211121',cardColor:'#2a1727',cardHoverColor:'#3c2035',titleColor:'#f4dfc0',subtitleColor:'#c49a75',textColor:'#e1cfc2',questionColor:'#ffe9cc',optionColor:'#dfc9ba',mutedColor:'#997f7f',accentColor:'#b88a44',accentSecondaryColor:'#7b294d',borderColor:'#5d344a',buttonTextColor:'#1b1016',buttonBackgroundColor:'#c39a58',buttonHoverColor:'#e4c282',progressBackgroundColor:'#45233a',progressColor:'#c39a58',sliderStartColor:'#7b294d',sliderMiddleColor:'#b88a44',sliderEndColor:'#e4c282',sliderThumbColor:'#fff0dc',bestColor:'#c39a58',worstColor:'#7b294d'
  },
  forest:{
    label:'森林',backgroundColor:'#08110d',backgroundSecondaryColor:'#14271c',panelColor:'#0e1a13',cardColor:'#122018',cardHoverColor:'#1b3023',titleColor:'#e9f0d8',subtitleColor:'#9fb78d',textColor:'#cfdbc7',questionColor:'#f1f6df',optionColor:'#cedbc5',mutedColor:'#71836c',accentColor:'#8ca85b',accentSecondaryColor:'#c3a765',borderColor:'#304936',buttonTextColor:'#0d160f',buttonBackgroundColor:'#96b464',buttonHoverColor:'#b7ce88',progressBackgroundColor:'#263c2b',progressColor:'#96b464',sliderStartColor:'#5d7f50',sliderMiddleColor:'#96b464',sliderEndColor:'#c3a765',sliderThumbColor:'#eef5df',bestColor:'#96b464',worstColor:'#9a7149'
  },
  future:{
    label:'未來',backgroundColor:'#070b12',backgroundSecondaryColor:'#142236',panelColor:'#0d1522',cardColor:'#101c2b',cardHoverColor:'#182a40',titleColor:'#eaf7ff',subtitleColor:'#82bde1',textColor:'#c8dae7',questionColor:'#f1fbff',optionColor:'#c6ddeb',mutedColor:'#71899a',accentColor:'#4ec5e6',accentSecondaryColor:'#7a8dff',borderColor:'#2e4961',buttonTextColor:'#061018',buttonBackgroundColor:'#58c9e8',buttonHoverColor:'#8de0f5',progressBackgroundColor:'#22384a',progressColor:'#58c9e8',sliderStartColor:'#4ec5e6',sliderMiddleColor:'#6ba5ee',sliderEndColor:'#9a79ff',sliderThumbColor:'#f1fbff',bestColor:'#58c9e8',worstColor:'#7a8dff'
  },
  white:{
    label:'純白',backgroundColor:'#f6f6f4',backgroundSecondaryColor:'#e8e8e3',panelColor:'#ffffff',cardColor:'#fbfbf9',cardHoverColor:'#eeeeea',titleColor:'#1d1d1b',subtitleColor:'#666660',textColor:'#3d3d39',questionColor:'#161614',optionColor:'#333330',mutedColor:'#888880',accentColor:'#222220',accentSecondaryColor:'#90908a',borderColor:'#cfcfc8',buttonTextColor:'#ffffff',buttonBackgroundColor:'#222220',buttonHoverColor:'#4b4b47',progressBackgroundColor:'#ddddD7',progressColor:'#222220',sliderStartColor:'#bdbdb6',sliderMiddleColor:'#777772',sliderEndColor:'#222220',sliderThumbColor:'#ffffff',bestColor:'#343430',worstColor:'#999992'
  }
};
async function api(path,options={}){const r=await fetch(`/api/${path}`,{credentials:'include',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`HTTP ${r.status}`);return d}
function notice(t,error=false){$('#notice').innerHTML=`<div class="notice ${error?'error':''}">${esc(t)}</div>`;setTimeout(()=>$('#notice').innerHTML='',4000)}
async function session(){try{await api('session');showAdmin();await load()}catch{showLogin()}}
function showLogin(){$('#loginView').classList.remove('hidden');$('#adminView').classList.add('hidden')}
function showAdmin(){$('#loginView').classList.add('hidden');$('#adminView').classList.remove('hidden')}
async function load(){S.data=await api('repository');S.scriptId=S.scriptId||S.data.index.defaultScriptId||S.data.index.scripts[0]?.id;S.dirty=false;render()}
function script(){return S.data.scripts[S.scriptId]}
function setDirty(){S.dirty=true;$('#publishBtn').textContent='儲存並發布 *'}
function bindInput(selector,handler){document.querySelectorAll(selector).forEach(el=>el.addEventListener('input',e=>{handler(e.target);setDirty()}))}
function render(){document.querySelectorAll('aside [data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===S.tab));$('#pageTitle').textContent={scripts:'劇本',story:'開場動畫',questions:'題目',characters:'角色',bgm:'BGM'}[S.tab];$('#currentScriptLabel').textContent=script()?.settings?.name||'';({scripts:renderScripts,story:renderStory,questions:renderQuestions,characters:renderCharacters,bgm:renderBgm}[S.tab])();bindCommon()}
function bindCommon(){document.querySelectorAll('[data-action=delete]').forEach(b=>b.onclick=()=>{if(confirm('確定刪除？')){const path=b.dataset.path.split('.');let obj=S.data;for(let i=0;i<path.length-1;i++)obj=obj[path[i]];obj.splice(Number(path.at(-1)),1);setDirty();render()}})}

function renderScripts(){
 $('#editor').innerHTML=`<div class="card"><div class="row"><h2>劇本清單</h2><span class="spacer"></span><button id="addScript">＋ 新增劇本</button></div>
 ${(S.data.index.scripts||[]).map(x=>`
  <div class="script-card ${x.id===S.scriptId?'selected':''}">
    <div>
      <strong>${esc(x.name)}</strong><br>
      <small class="muted">${esc(x.id)} · ${esc(x.status)}</small><br>
      <small class="muted">${esc(`${location.origin}/?script=${encodeURIComponent(x.id)}`)}</small>
    </div>
    <div class="row">
      <button
        class="secondary"
        data-copy-entry="${esc(x.id)}"
        type="button"
      >
        複製入口網址
      </button>
      <button
        class="secondary"
        data-preview-entry="${esc(x.id)}"
        type="button"
      >
        開啟測驗
      </button>
      <button
        class="secondary"
        data-open="${esc(x.id)}"
        type="button"
      >
        編輯
      </button>
      ${x.id!==S.data.index.defaultScriptId?`
        <button
          class="danger"
          data-remove-script="${esc(x.id)}"
          type="button"
        >
          刪除
        </button>
      `:''}
    </div>
  </div>
`).join('')}</div>
 ${script()?`<div class="card"><h2>目前劇本設定</h2><div class="grid"><div class="field"><label>劇本名稱</label><input id="scriptName" value="${esc(script().settings.name)}"></div><div class="field"><label>網址 ID</label><input value="${esc(S.scriptId)}" disabled></div><div class="field"><label>狀態</label><select id="scriptStatus"><option value="published" ${script().meta.status==='published'?'selected':''}>公開</option><option value="draft" ${script().meta.status==='draft'?'selected':''}>草稿</option></select></div><div class="field"><label>網站標題</label><input id="scriptTitle" value="${esc(script().settings.title||'')}"></div><div class="field"><label>Google Apps Script Web App URL</label><input id="googleSheetUrl" placeholder="https://script.google.com/macros/s/.../exec" value="${esc(script().settings.googleSheets?.webAppUrl||'')}"></div><div class="field theme-color-group">
<label>劇本主題顏色</label>

<div class="theme-preset-panel">
  <div class="row">
    <div>
      <strong>Theme Preset</strong>
      <small class="muted">點一下立即套用完整配色，再按儲存並發布。</small>
    </div>
    <span class="spacer"></span>
    <button id="resetThemePreset" class="secondary" type="button">重置黑金</button>
  </div>
  <div class="theme-preset-grid">
    ${Object.entries(THEME_PRESETS).map(([key,preset])=>`
      <button
        class="theme-preset-button"
        data-theme-preset="${key}"
        type="button"
        style="--preset-bg:${preset.backgroundColor};--preset-accent:${preset.accentColor};--preset-title:${preset.titleColor}"
      >
        <i></i>
        <span>${preset.label}</span>
      </button>
    `).join('')}
  </div>
</div>

${[
  ['backgroundColor','背景顏色','#080a0f'],
  ['backgroundSecondaryColor','第二背景','#151a25'],
  ['panelColor','面板背景','#0d1016'],
  ['cardColor','卡片背景','#0e1117'],
  ['cardHoverColor','卡片 Hover','#131722'],
  ['titleColor','主標題文字','#f4efe2'],
  ['subtitleColor','副標題文字','#b8b9bf'],
  ['textColor','一般內文','#d8d9de'],
  ['questionColor','題目文字','#f1ede4'],
  ['optionColor','選項文字','#d8d9de'],
  ['mutedColor','弱化文字','#8e949e'],
  ['accentColor','強調色','#d7c28b'],
  ['accentSecondaryColor','第二強調色','#aeb9d7'],
  ['borderColor','邊框顏色','#333842'],
  ['buttonTextColor','按鈕文字','#111318'],
  ['buttonBackgroundColor','按鈕背景','#d7c28b'],
  ['buttonHoverColor','按鈕 Hover','#f4efe2'],
  ['progressBackgroundColor','進度條底色','#22262d'],
  ['progressColor','進度條','#d7c28b'],
  ['sliderStartColor','拉桿左側','#d5c38a'],
  ['sliderMiddleColor','拉桿中央','#aabfac'],
  ['sliderEndColor','拉桿右側','#9eacd1'],
  ['sliderThumbColor','拉桿按鈕','#f2f4f1'],
  ['bestColor','最喜歡','#d9c993'],
  ['worstColor','最不喜歡','#aeb9d7']
].map(([key,label,fallback])=>`
  <div class="theme-color-item">
    <span>${label}</span>
    <div class="color-setting-row">
      <input
        type="color"
        data-theme-color-picker="${key}"
        value="${esc(script().settings.theme?.[key]||fallback)}"
      >
      <input
        data-theme-color-text="${key}"
        value="${esc(script().settings.theme?.[key]||fallback)}"
        maxlength="7"
        placeholder="${fallback}"
      >
    </div>
  </div>
`).join('')}

<small class="muted">
  每個劇本可使用不同的完整配色。
</small>
</div></div></div>`:''}`;
 document.querySelectorAll('[data-open]').forEach(button => {
   button.onclick = () => {
     S.scriptId = button.dataset.open;
     render();
   };
 });

 document.querySelectorAll('[data-copy-entry]').forEach(button => {
   button.onclick = async () => {
     const url =
       `${window.location.origin}/?script=${encodeURIComponent(button.dataset.copyEntry)}`;

     try {
       await navigator.clipboard.writeText(url);
       notice(`已複製入口網址：${url}`);
     } catch {
       window.prompt(
         '請複製劇本入口網址',
         url
       );
     }
   };
 });

 document.querySelectorAll('[data-preview-entry]').forEach(button => {
   button.onclick = () => {
     const url =
       `${window.location.origin}/?script=${encodeURIComponent(button.dataset.previewEntry)}`;

     window.open(
       url,
       '_blank',
       'noopener,noreferrer'
     );
   };
 });
 $('#addScript').onclick=()=>{const name=prompt('新劇本名稱');if(!name)return;let id=(prompt('網址 ID（英文、數字、連字號）',`story-${Date.now()}`)||'').trim().toLowerCase().replace(/[^a-z0-9-]/g,'-');if(!id||S.data.scripts[id])return notice('ID 無效或已存在',true);const base=structuredClone(script());base.settings.id=id;
base.settings.name=name;
base.settings.title=name;
base.settings.theme=structuredClone(
  base.settings.theme||{
    backgroundColor:'#080a0f',
    titleColor:'#f4efe2',
    textColor:'#d8d9de',
    questionColor:'#f1ede4',
    optionColor:'#d8d9de',
    mutedColor:'#8e949e',
    accentColor:'#d7c28b',
    buttonTextColor:'#111318',
    buttonBackgroundColor:'#d7c28b'
  }
);base.meta={id,name,status:'draft',cover:''};S.data.scripts[id]=base;S.data.index.scripts.push(base.meta);S.scriptId=id;setDirty();render()};
 document.querySelectorAll('[data-remove-script]').forEach(b=>b.onclick=()=>{if(!confirm('將刪除整個劇本資料與素材，確定？'))return;const id=b.dataset.removeScript;delete S.data.scripts[id];S.data.index.scripts=S.data.index.scripts.filter(x=>x.id!==id);S.scriptId=S.data.index.defaultScriptId;setDirty();render()});
 if($('#scriptName')){
   $('#scriptName').oninput=e=>{
     script().settings.name=e.target.value;
     script().meta.name=e.target.value;
     setDirty()
   };
   $('#scriptTitle').oninput=e=>{
     script().settings.title=e.target.value;
     setDirty()
   };
   $('#scriptStatus').onchange=e=>{
     script().meta.status=e.target.value;
     setDirty()
   };
   $('#googleSheetUrl').oninput=e=>{
     script().settings.googleSheets ||= {};
     script().settings.googleSheets.webAppUrl=e.target.value.trim();
     setDirty()
   };

   const applyThemePreset=presetKey=>{
     const preset=THEME_PRESETS[presetKey];
     if(!preset)return;

     script().settings.theme ||= {};

     Object.entries(preset).forEach(([key,value])=>{
       if(key==='label')return;
       script().settings.theme[key]=value.toLowerCase();
     });

     setDirty();
     notice(`已套用「${preset.label}」配色，請按儲存並發布`);
     render();
   };

   document
     .querySelectorAll('[data-theme-preset]')
     .forEach(button=>{
       button.onclick=()=>{
         applyThemePreset(button.dataset.themePreset)
       }
     });

   $('#resetThemePreset').onclick=()=>{
     applyThemePreset('blackGold')
   };

   const themeDefaults={
     backgroundColor:'#080a0f',backgroundSecondaryColor:'#151a25',panelColor:'#0d1016',cardColor:'#0e1117',cardHoverColor:'#131722',
     titleColor:'#f4efe2',subtitleColor:'#b8b9bf',textColor:'#d8d9de',questionColor:'#f1ede4',optionColor:'#d8d9de',mutedColor:'#8e949e',
     accentColor:'#d7c28b',accentSecondaryColor:'#aeb9d7',borderColor:'#333842',buttonTextColor:'#111318',buttonBackgroundColor:'#d7c28b',buttonHoverColor:'#f4efe2',
     progressBackgroundColor:'#22262d',progressColor:'#d7c28b',sliderStartColor:'#d5c38a',sliderMiddleColor:'#aabfac',sliderEndColor:'#9eacd1',sliderThumbColor:'#f2f4f1',
     bestColor:'#d9c993',worstColor:'#aeb9d7'
   };

   const saveThemeColor=(key,value)=>{
     const normalized=String(value||'').trim();

     if(!/^#[0-9a-fA-F]{6}$/.test(normalized)){
       return false
     }

     script().settings.theme ||= {};
     script().settings.theme[key]=normalized.toLowerCase();

     const picker=document.querySelector(
       `[data-theme-color-picker="${key}"]`
     );

     const text=document.querySelector(
       `[data-theme-color-text="${key}"]`
     );

     if(picker)picker.value=normalized;
     if(text)text.value=normalized.toLowerCase();

     setDirty();
     return true
   };

   document
     .querySelectorAll('[data-theme-color-picker]')
     .forEach(input=>{
       input.oninput=e=>{
         saveThemeColor(
           e.target.dataset.themeColorPicker,
           e.target.value
         )
       }
     });

   document
     .querySelectorAll('[data-theme-color-text]')
     .forEach(input=>{
       input.onchange=e=>{
         const key=e.target.dataset.themeColorText;

         if(!saveThemeColor(key,e.target.value)){
           notice(
             '顏色請使用 #RRGGBB 格式，例如 #d7c28b',
             true
           );

           e.target.value=
             script().settings.theme?.[key]||
             themeDefaults[key]
         }
       }
     });
 }
}

function renderStory(){
 const st=script().story;
 const section=(key,title)=>`<div class="card"><div class="row"><h2>${title}</h2><span class="spacer"></span><button data-add-scene="${key}">＋新增段落</button></div>${(st[key]||[]).map((x,i)=>`<div class="list-item"><div class="grid"><div class="field"><label>章節標題</label><input data-story="${key}" data-i="${i}" data-k="chapter" value="${esc(x.chapter||'')}"></div><div class="field"><label>停留毫秒（4000 = 4 秒）</label><input type="number" data-story="${key}" data-i="${i}" data-k="hold" value="${Number(x.hold||900)}"></div></div><div class="field"><label>文字，每行一段</label><textarea data-story-lines="${key}" data-i="${i}">${esc((x.lines||[]).join('\n'))}</textarea></div><button class="danger" data-remove-scene="${key}" data-i="${i}">刪除段落</button></div>`).join('')}</div>`;
 $('#editor').innerHTML=`<div class="card"><h2>首頁第一句</h2><div class="field"><label>每行一段</label><textarea id="openingQuote">${esc(st.opening.quote.join('\n'))}</textarea></div><div class="field"><label>開始按鈕</label><input id="openingButton" value="${esc(st.opening.button)}"></div></div>${section('prologue','開場動畫')}${section('interludes','題目間動畫')}${section('epilogue','結果前動畫')}`;
 $('#openingQuote').oninput=e=>{st.opening.quote=e.target.value.split('\n');setDirty()};$('#openingButton').oninput=e=>{st.opening.button=e.target.value;setDirty()};
 bindInput('[data-story]',el=>{st[el.dataset.story][el.dataset.i][el.dataset.k]=el.dataset.k==='hold'?Number(el.value):el.value});
 bindInput('[data-story-lines]',el=>{st[el.dataset.story][el.dataset.i].lines=el.value.split('\n')});
 document.querySelectorAll('[data-add-scene]').forEach(b=>b.onclick=()=>{st[b.dataset.addScene].push({chapter:'',lines:['新段落'],hold:4000});setDirty();render()});
 document.querySelectorAll('[data-remove-scene]').forEach(b=>b.onclick=()=>{st[b.dataset.removeScene].splice(Number(b.dataset.i),1);setDirty();render()});
}

function renderQuestions() {
  const qs = script().questions;
  const characters =
    script().characters.male || [];

  const scoreInputs = (
    attribute,
    value,
    labelPrefix = ''
  ) => [0, 1, 2].map(index => `
    <label>
      ${esc(labelPrefix)}
      ${esc(characters[index]?.name || `角色${index + 1}`)}
      <input
        type="number"
        ${attribute}="${value}:${index}"
      >
    </label>
  `).join('');

  const renderSingle = (q, qi) => `
    <h3>單選答案與角色分數</h3>

    ${(q.answers || []).map((answer, ai) => `
      <div class="list-item">
        <div class="score-grid">
          <input
            data-answer-text="${qi}:${ai}"
            value="${esc(answer.text)}"
            placeholder="答案文字"
          >

          ${[0, 1, 2].map(si => `
            <label>
              ${esc(characters[si]?.name || `角色${si + 1}`)}
              <input
                type="number"
                data-score="${qi}:${ai}:${si}"
                value="${Number(answer.score?.[si] || 0)}"
              >
            </label>
          `).join('')}

          <button
            class="danger"
            data-remove-a="${qi}:${ai}"
            type="button"
          >
            刪除
          </button>
        </div>
      </div>
    `).join('')}

    <button
      data-add-answer="${qi}"
      type="button"
    >
      ＋新增答案
    </button>
  `;

  const renderBestWorst = (q, qi) => `
    <h3>四選項：最喜歡與最不喜歡</h3>

    <p class="muted">
      玩家必須各選一個。每個選項可分別設定「選為最喜歡」和
      「選為最不喜歡」時，三名角色得到的分數。
    </p>

    ${(q.answers || []).map((answer, ai) => `
      <div class="list-item">
        <div class="field">
          <label>選項 ${ai + 1}</label>
          <input
            data-answer-text="${qi}:${ai}"
            value="${esc(answer.text)}"
          >
        </div>

        <h4>被選為最喜歡時</h4>
        <div class="score-row">
          ${[0, 1, 2].map(si => `
            <label>
              ${esc(characters[si]?.name || `角色${si + 1}`)}
              <input
                type="number"
                data-most-score="${qi}:${ai}:${si}"
                value="${Number(answer.mostScore?.[si] ?? answer.score?.[si] ?? 0)}"
              >
            </label>
          `).join('')}
        </div>

        <h4>被選為最不喜歡時</h4>
        <div class="score-row">
          ${[0, 1, 2].map(si => `
            <label>
              ${esc(characters[si]?.name || `角色${si + 1}`)}
              <input
                type="number"
                data-least-score="${qi}:${ai}:${si}"
                value="${Number(answer.leastScore?.[si] || 0)}"
              >
            </label>
          `).join('')}
        </div>

        <button
          class="danger"
          data-remove-a="${qi}:${ai}"
          type="button"
        >
          刪除選項
        </button>
      </div>
    `).join('')}

    <button
      data-add-answer="${qi}"
      type="button"
      ${(q.answers || []).length >= 4 ? 'disabled' : ''}
    >
      ＋新增選項
    </button>

    <small class="muted">
      建議維持 4 個選項。
    </small>
  `;

  const renderSlider = (q, qi) => {
    const slider = q.slider || {};

    return `
      <h3>程度拉桿</h3>

      <div class="grid three">
        <div class="field">
          <label>最低值</label>
          <input
            type="number"
            data-slider="${qi}:min"
            value="${Number(slider.min ?? 0)}"
          >
        </div>

        <div class="field">
          <label>最高值</label>
          <input
            type="number"
            data-slider="${qi}:max"
            value="${Number(slider.max ?? 100)}"
          >
        </div>

        <div class="field">
          <label>預設值</label>
          <input
            type="number"
            data-slider="${qi}:default"
            value="${Number(slider.default ?? 50)}"
          >
        </div>

        <div class="field">
          <label>左側文字</label>
          <input
            data-slider="${qi}:leftLabel"
            value="${esc(slider.leftLabel || '偏左')}"
          >
        </div>

        <div class="field">
          <label>中央文字</label>
          <input
            data-slider="${qi}:centerLabel"
            value="${esc(slider.centerLabel || '彼此平衡')}"
          >
        </div>

        <div class="field">
          <label>右側文字</label>
          <input
            data-slider="${qi}:rightLabel"
            value="${esc(slider.rightLabel || '偏右')}"
          >
        </div>
      </div>

      <div class="list-item">
        <h4>拉到最左端時的角色分數</h4>
        <div class="score-row">
          ${[0, 1, 2].map(si => `
            <label>
              ${esc(characters[si]?.name || `角色${si + 1}`)}
              <input
                type="number"
                data-slider-min-score="${qi}:${si}"
                value="${Number(slider.minScore?.[si] || 0)}"
              >
            </label>
          `).join('')}
        </div>
      </div>

      <div class="list-item">
        <h4>拉到最右端時的角色分數</h4>
        <div class="score-row">
          ${[0, 1, 2].map(si => `
            <label>
              ${esc(characters[si]?.name || `角色${si + 1}`)}
              <input
                type="number"
                data-slider-max-score="${qi}:${si}"
                value="${Number(slider.maxScore?.[si] || 0)}"
              >
            </label>
          `).join('')}
        </div>

        <p class="muted">
          中間位置會依比例自動計算分數。
        </p>
      </div>
    `;
  };

  $('#editor').innerHTML = `
    <div class="card">
      <div class="row">
        <h2>題目</h2>
        <span class="spacer"></span>
        <button id="addQuestion" type="button">
          ＋新增題目
        </button>
      </div>
    </div>

    ${qs.map((q, qi) => {
      const type = q.type || 'single';

      return `
        <div class="card">
          <div class="row">
            <h2>第 ${qi + 1} 題</h2>
            <span class="spacer"></span>

            <button
              class="danger"
              data-remove-q="${qi}"
              type="button"
            >
              刪除題目
            </button>
          </div>

          <div class="field">
            <label>題目類型</label>
            <select data-question-type="${qi}">
              <option value="single" ${type === 'single' ? 'selected' : ''}>
                一般單選題
              </option>
              <option value="bestWorst" ${type === 'bestWorst' ? 'selected' : ''}>
                四選項：最喜歡＋最不喜歡
              </option>
              <option value="slider" ${type === 'slider' ? 'selected' : ''}>
                程度拉桿
              </option>
            </select>
          </div>

          <div class="field">
            <label>場景</label>
            <textarea
              data-q="${qi}"
              data-k="scene"
            >${esc(q.scene || '')}</textarea>
          </div>

          <div class="field">
            <label>題目</label>
            <textarea
              data-q="${qi}"
              data-k="question"
            >${esc(q.question || '')}</textarea>
          </div>

          ${
            type === 'bestWorst'
              ? renderBestWorst(q, qi)
              : type === 'slider'
                ? renderSlider(q, qi)
                : renderSingle(q, qi)
          }
        </div>
      `;
    }).join('')}
  `;

  bindInput('[data-q]', element => {
    qs[element.dataset.q][element.dataset.k] =
      element.value;
  });

  bindInput('[data-answer-text]', element => {
    const [q, a] =
      element.dataset.answerText
        .split(':')
        .map(Number);

    qs[q].answers[a].text =
      element.value;
  });

  bindInput('[data-score]', element => {
    const [q, a, s] =
      element.dataset.score
        .split(':')
        .map(Number);

    qs[q].answers[a].score[s] =
      Number(element.value);
  });

  bindInput('[data-most-score]', element => {
    const [q, a, s] =
      element.dataset.mostScore
        .split(':')
        .map(Number);

    qs[q].answers[a].mostScore ||= [0, 0, 0];
    qs[q].answers[a].mostScore[s] =
      Number(element.value);
  });

  bindInput('[data-least-score]', element => {
    const [q, a, s] =
      element.dataset.leastScore
        .split(':')
        .map(Number);

    qs[q].answers[a].leastScore ||= [0, 0, 0];
    qs[q].answers[a].leastScore[s] =
      Number(element.value);
  });

  bindInput('[data-slider]', element => {
    const [q, key] =
      element.dataset.slider.split(':');

    qs[Number(q)].slider ||= {};

    const numericKeys =
      new Set([
        'min',
        'max',
        'default',
        'step'
      ]);

    qs[Number(q)].slider[key] =
      numericKeys.has(key)
        ? Number(element.value)
        : element.value;
  });

  bindInput('[data-slider-min-score]', element => {
    const [q, s] =
      element.dataset.sliderMinScore
        .split(':')
        .map(Number);

    qs[q].slider ||= {};
    qs[q].slider.minScore ||= [0, 0, 0];
    qs[q].slider.minScore[s] =
      Number(element.value);
  });

  bindInput('[data-slider-max-score]', element => {
    const [q, s] =
      element.dataset.sliderMaxScore
        .split(':')
        .map(Number);

    qs[q].slider ||= {};
    qs[q].slider.maxScore ||= [0, 0, 0];
    qs[q].slider.maxScore[s] =
      Number(element.value);
  });

  document
    .querySelectorAll('[data-question-type]')
    .forEach(select => {
      select.addEventListener('change', () => {
        const q =
          qs[Number(select.dataset.questionType)];

        q.type = select.value;

        if (q.type === 'single') {
          q.answers ||= [
            {
              text: '答案 A',
              score: [0, 0, 0]
            }
          ];
        }

        if (q.type === 'bestWorst') {
          q.answers = Array.from(
            { length: 4 },
            (_, index) => {
              const old =
                q.answers?.[index] || {};

              return {
                text:
                  old.text ||
                  `選項 ${index + 1}`,
                mostScore:
                  old.mostScore ||
                  old.score ||
                  [0, 0, 0],
                leastScore:
                  old.leastScore ||
                  [0, 0, 0]
              };
            }
          );
        }

        if (q.type === 'slider') {
          q.slider ||= {
            min: 0,
            max: 100,
            step: 1,
            default: 50,
            leftLabel: '偏付出',
            centerLabel: '彼此平衡',
            rightLabel: '偏被付出',
            minScore: [0, 0, 0],
            maxScore: [0, 0, 0]
          };
        }

        setDirty();
        render();
      });
    });

  $('#addQuestion').onclick = () => {
    qs.push({
      type: 'single',
      scene: '',
      question: '新題目',
      answers: [
        {
          text: '答案 A',
          score: [0, 0, 0]
        }
      ]
    });

    setDirty();
    render();
  };

  document
    .querySelectorAll('[data-remove-q]')
    .forEach(button => {
      button.onclick = () => {
        qs.splice(
          Number(button.dataset.removeQ),
          1
        );

        setDirty();
        render();
      };
    });

  document
    .querySelectorAll('[data-add-answer]')
    .forEach(button => {
      button.onclick = () => {
        const q =
          qs[Number(button.dataset.addAnswer)];

        if (
          q.type === 'bestWorst' &&
          q.answers.length >= 4
        ) {
          return;
        }

        q.answers.push(
          q.type === 'bestWorst'
            ? {
                text: '新選項',
                mostScore: [0, 0, 0],
                leastScore: [0, 0, 0]
              }
            : {
                text: '新答案',
                score: [0, 0, 0]
              }
        );

        setDirty();
        render();
      };
    });

  document
    .querySelectorAll('[data-remove-a]')
    .forEach(button => {
      button.onclick = () => {
        const [q, a] =
          button.dataset.removeA
            .split(':')
            .map(Number);

        qs[q].answers.splice(a, 1);
        setDirty();
        render();
      };
    });
}

function renderCharacters(){
 const c=script().characters;
 const group=(key,title)=>`<div class="card"><div class="row"><h2>${title}</h2><span class="spacer"></span><button data-add-char="${key}">＋新增角色</button></div>${c[key].map((x,i)=>`<div class="list-item"><div class="grid three"><div class="field"><label>角色名</label><input data-char="${key}:${i}:name" value="${esc(x.name)}"></div><div class="field"><label>韓文／副標</label><input data-char="${key}:${i}:kr" value="${esc(x.kr||'')}"></div><div class="field"><label>角色 ID</label><input data-char="${key}:${i}:id" value="${esc(x.id)}"></div></div><div class="field"><label>角色介紹</label><textarea data-char="${key}:${i}:description">${esc(x.description||x.desc||'')}</textarea></div><div class="grid"><div>${x.image?`<img class="preview" src="/${esc(x.image)}">`:''}<div class="dropzone" data-upload="image" data-group="${key}" data-i="${i}">拖曳角色圖片，或點擊選擇<input type="file" accept="image/*" hidden></div></div><div>${x.music?`<audio controls src="/${esc(x.music)}"></audio>`:''}<div class="dropzone" data-upload="music" data-group="${key}" data-i="${i}">拖曳角色音樂 MP3，或點擊選擇<input type="file" accept="audio/*" hidden></div></div></div><button class="danger" data-remove-char="${key}:${i}">刪除角色</button></div>`).join('')}</div>`;
 $('#editor').innerHTML=`<div class="tabs"><button class="active">角色資料</button></div>${group('male','男角')}${group('female','女角')}`;
 bindInput('[data-char]',el=>{const [g,i,k]=el.dataset.char.split(':');c[g][Number(i)][k]=el.value});
 document.querySelectorAll('[data-add-char]').forEach(b=>b.onclick=()=>{c[b.dataset.addChar].push({id:`character-${Date.now()}`,name:'新角色',kr:'',image:'',description:'',music:''});setDirty();render()});
 document.querySelectorAll('[data-remove-char]').forEach(b=>b.onclick=()=>{const [g,i]=b.dataset.removeChar.split(':');c[g].splice(Number(i),1);setDirty();render()});
 bindDropzones();
}

function renderBgm(){
 const bgm=script().settings.bgm||={src:'',autoplay:false,loop:true,volume:.35};
 $('#editor').innerHTML=`<div class="card"><h2>劇本 BGM</h2>${bgm.src?`<audio controls src="/${esc(bgm.src)}"></audio><p><small>${esc(bgm.src)}</small></p>`:''}<div class="dropzone" data-upload="bgm">將 MP3 拖到這裡，或點擊選擇<input type="file" accept="audio/*" hidden></div><div class="grid three"><label><input id="bgmLoop" type="checkbox" ${bgm.loop?'checked':''}> 循環播放</label><label><input id="bgmAutoplay" type="checkbox" ${bgm.autoplay?'checked':''}> 自動播放</label><div class="field"><label>音量 0～1</label><input id="bgmVolume" type="number" min="0" max="1" step=".05" value="${bgm.volume}"></div></div></div>`;
 $('#bgmLoop').onchange=e=>{bgm.loop=e.target.checked;setDirty()};$('#bgmAutoplay').onchange=e=>{bgm.autoplay=e.target.checked;setDirty()};$('#bgmVolume').oninput=e=>{bgm.volume=Number(e.target.value);setDirty()};bindDropzones()
}

function bindDropzones(){
 document.querySelectorAll('.dropzone').forEach(z=>{
   const input=z.querySelector('input');z.onclick=()=>input.click();input.onchange=()=>uploadFile(input.files[0],z);
   ['dragenter','dragover'].forEach(ev=>z.addEventListener(ev,e=>{e.preventDefault();z.classList.add('over')}));
   ['dragleave','drop'].forEach(ev=>z.addEventListener(ev,e=>{e.preventDefault();z.classList.remove('over')}));
   z.addEventListener('drop',e=>uploadFile(e.dataTransfer.files[0],z));
 })
}
async function uploadFile(file,z){
 if(!file)return;notice(`正在上傳 ${file.name}…`);
 const base64=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=reject;r.readAsDataURL(file)});
 const result=await api('upload-file',{method:'POST',body:JSON.stringify({scriptId:S.scriptId,kind:z.dataset.upload,fileName:file.name,contentBase64:base64})});
 if(z.dataset.upload==='bgm')script().settings.bgm.src=result.path;
 else{const c=script().characters[z.dataset.group][Number(z.dataset.i)];if(z.dataset.upload==='image')c.image=result.path;else c.music=result.path}
 setDirty();notice('檔案已暫存，請按「儲存並發布」');render()
}

$('#loginForm').onsubmit=async e=>{e.preventDefault();try{await api('login',{method:'POST',body:JSON.stringify({password:$('#password').value})});showAdmin();await load()}catch(err){$('#loginStatus').textContent=err.message}};
document.querySelectorAll('aside [data-tab]').forEach(b=>b.onclick=()=>{S.tab=b.dataset.tab;render()});
$('#reloadBtn').onclick=async()=>{if(S.dirty&&!confirm('尚未發布的修改會消失，繼續？'))return;await load();notice('已重新載入')};
$('#publishBtn').onclick=async()=>{try{$('#publishBtn').disabled=true;S.data.hosts=[];await api('publish',{method:'POST',body:JSON.stringify(S.data)});S.dirty=false;$('#publishBtn').textContent='儲存並發布';notice('已 Commit 到 GitHub，等待 Cloudflare 部署')}catch(e){notice(e.message,true)}finally{$('#publishBtn').disabled=false}};
$('#logoutBtn').onclick=async()=>{await api('logout',{method:'POST'});showLogin()};
session();
