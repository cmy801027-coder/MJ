'use strict';

const S={tab:'scripts',data:null,scriptId:null,dirty:false};
const $=s=>document.querySelector(s), esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
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
 ${script()?`<div class="card"><h2>目前劇本設定</h2><div class="grid"><div class="field"><label>劇本名稱</label><input id="scriptName" value="${esc(script().settings.name)}"></div><div class="field"><label>網址 ID</label><input value="${esc(S.scriptId)}" disabled></div><div class="field"><label>狀態</label><select id="scriptStatus"><option value="published" ${script().meta.status==='published'?'selected':''}>公開</option><option value="draft" ${script().meta.status==='draft'?'selected':''}>草稿</option></select></div><div class="field"><label>網站標題</label><input id="scriptTitle" value="${esc(script().settings.title||'')}"></div><div class="field"><label>Google Apps Script Web App URL</label><input id="googleSheetUrl" placeholder="https://script.google.com/macros/s/.../exec" value="${esc(script().settings.googleSheets?.webAppUrl||'')}"></div><div class="field"><label>測驗背景顏色</label><div class="color-setting-row"><input id="scriptBackgroundColor" type="color" value="${esc(script().settings.theme?.backgroundColor||'#080a0f')}"><input id="scriptBackgroundColorText" value="${esc(script().settings.theme?.backgroundColor||'#080a0f')}" maxlength="7" placeholder="#080a0f"></div><small class="muted">每個劇本可設定不同背景顏色。</small></div></div></div>`:''}`;
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
 $('#addScript').onclick=()=>{const name=prompt('新劇本名稱');if(!name)return;let id=(prompt('網址 ID（英文、數字、連字號）',`story-${Date.now()}`)||'').trim().toLowerCase().replace(/[^a-z0-9-]/g,'-');if(!id||S.data.scripts[id])return notice('ID 無效或已存在',true);const base=structuredClone(script());base.settings.id=id;base.settings.name=name;base.settings.title=name;base.settings.theme=structuredClone(base.settings.theme||{backgroundColor:'#080a0f'});base.meta={id,name,status:'draft',cover:''};S.data.scripts[id]=base;S.data.index.scripts.push(base.meta);S.scriptId=id;setDirty();render()};
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

   const saveBackgroundColor=value=>{
     const normalized=String(value||'').trim();
     if(!/^#[0-9a-fA-F]{6}$/.test(normalized))return;
     script().settings.theme ||= {};
     script().settings.theme.backgroundColor=normalized.toLowerCase();
     $('#scriptBackgroundColor').value=normalized;
     $('#scriptBackgroundColorText').value=normalized.toLowerCase();
     setDirty()
   };

   $('#scriptBackgroundColor').oninput=e=>{
     saveBackgroundColor(e.target.value)
   };

   $('#scriptBackgroundColorText').onchange=e=>{
     if(!/^#[0-9a-fA-F]{6}$/.test(e.target.value.trim())){
       notice('背景顏色請使用 #RRGGBB 格式，例如 #080a0f',true);
       e.target.value=script().settings.theme?.backgroundColor||'#080a0f';
       return
     }
     saveBackgroundColor(e.target.value)
   };
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
