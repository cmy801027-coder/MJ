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
function render(){document.querySelectorAll('aside [data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===S.tab));$('#pageTitle').textContent={scripts:'劇本',story:'開場動畫',questions:'題目',characters:'角色',hosts:'主持人',bgm:'BGM'}[S.tab];$('#currentScriptLabel').textContent=script()?.settings?.name||'';({scripts:renderScripts,story:renderStory,questions:renderQuestions,characters:renderCharacters,hosts:renderHosts,bgm:renderBgm}[S.tab])();bindCommon()}
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
 ${script()?`<div class="card"><h2>目前劇本設定</h2><div class="grid"><div class="field"><label>劇本名稱</label><input id="scriptName" value="${esc(script().settings.name)}"></div><div class="field"><label>網址 ID</label><input value="${esc(S.scriptId)}" disabled></div><div class="field"><label>狀態</label><select id="scriptStatus"><option value="published" ${script().meta.status==='published'?'selected':''}>公開</option><option value="draft" ${script().meta.status==='draft'?'selected':''}>草稿</option></select></div><div class="field"><label>網站標題</label><input id="scriptTitle" value="${esc(script().settings.title||'')}"></div></div></div>`:''}`;
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
 $('#addScript').onclick=()=>{const name=prompt('新劇本名稱');if(!name)return;let id=(prompt('網址 ID（英文、數字、連字號）',`story-${Date.now()}`)||'').trim().toLowerCase().replace(/[^a-z0-9-]/g,'-');if(!id||S.data.scripts[id])return notice('ID 無效或已存在',true);const base=structuredClone(script());base.settings.id=id;base.settings.name=name;base.settings.title=name;base.meta={id,name,status:'draft',cover:''};S.data.scripts[id]=base;S.data.index.scripts.push(base.meta);S.scriptId=id;setDirty();render()};
 document.querySelectorAll('[data-remove-script]').forEach(b=>b.onclick=()=>{if(!confirm('將刪除整個劇本資料與素材，確定？'))return;const id=b.dataset.removeScript;delete S.data.scripts[id];S.data.index.scripts=S.data.index.scripts.filter(x=>x.id!==id);S.scriptId=S.data.index.defaultScriptId;setDirty();render()});
 if($('#scriptName')){$('#scriptName').oninput=e=>{script().settings.name=e.target.value;script().meta.name=e.target.value;setDirty()};$('#scriptTitle').oninput=e=>{script().settings.title=e.target.value;setDirty()};$('#scriptStatus').onchange=e=>{script().meta.status=e.target.value;setDirty()}}
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

function renderQuestions(){
 const qs=script().questions, cs=[...(script().characters.male||[])];
 $('#editor').innerHTML=`<div class="card"><div class="row"><h2>題目</h2><span class="spacer"></span><button id="addQuestion">＋新增題目</button></div></div>${qs.map((q,qi)=>`<div class="card"><div class="row"><h2>第 ${qi+1} 題</h2><span class="spacer"></span><button class="danger" data-remove-q="${qi}">刪除題目</button></div><div class="field"><label>場景</label><textarea data-q="${qi}" data-k="scene">${esc(q.scene)}</textarea></div><div class="field"><label>題目</label><textarea data-q="${qi}" data-k="question">${esc(q.question)}</textarea></div><h3>答案與角色分數</h3>${q.answers.map((a,ai)=>`<div class="list-item"><div class="score-grid"><input data-answer-text="${qi}:${ai}" value="${esc(a.text)}">${[0,1,2].map(si=>`<label>${esc(cs[si]?.name||`角色${si+1}`)} <input type="number" data-score="${qi}:${ai}:${si}" value="${Number(a.score[si]||0)}"></label>`).join('')}<button class="danger" data-remove-a="${qi}:${ai}">刪除</button></div></div>`).join('')}<button data-add-answer="${qi}">＋新增答案</button></div>`).join('')}`;
 bindInput('[data-q]',el=>{qs[el.dataset.q][el.dataset.k]=el.value});
 bindInput('[data-answer-text]',el=>{const [q,a]=el.dataset.answerText.split(':').map(Number);qs[q].answers[a].text=el.value});
 bindInput('[data-score]',el=>{const [q,a,s]=el.dataset.score.split(':').map(Number);qs[q].answers[a].score[s]=Number(el.value)});
 $('#addQuestion').onclick=()=>{qs.push({scene:'',question:'新題目',answers:[{text:'答案 A',score:[0,0,0]}]});setDirty();render()};
 document.querySelectorAll('[data-remove-q]').forEach(b=>b.onclick=()=>{qs.splice(Number(b.dataset.removeQ),1);setDirty();render()});
 document.querySelectorAll('[data-add-answer]').forEach(b=>b.onclick=()=>{qs[Number(b.dataset.addAnswer)].answers.push({text:'新答案',score:[0,0,0]});setDirty();render()});
 document.querySelectorAll('[data-remove-a]').forEach(b=>b.onclick=()=>{const [q,a]=b.dataset.removeA.split(':').map(Number);qs[q].answers.splice(a,1);setDirty();render()});
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

function renderHosts(){
 $('#editor').innerHTML=`<div class="card"><div class="row"><h2>主持人</h2><span class="spacer"></span><button id="addHost">＋新增主持人</button></div>${S.data.hosts.map((h,i)=>`<div class="list-item"><div class="grid three"><div class="field"><label>顯示名稱</label><input data-host="${i}:displayName" value="${esc(h.displayName||h.name)}"></div><div class="field"><label>主持人 ID</label><input data-host="${i}:id" value="${esc(h.id)}"></div><div class="field"><label>備註</label><input data-host="${i}:note" value="${esc(h.note||'')}"></div></div><button class="danger" data-remove-host="${i}">刪除</button></div>`).join('')}</div>`;
 bindInput('[data-host]',el=>{const [i,k]=el.dataset.host.split(':');S.data.hosts[Number(i)][k]=el.value});
 $('#addHost').onclick=()=>{S.data.hosts.push({id:`host-${Date.now()}`,displayName:'新主持人',note:''});setDirty();render()};
 document.querySelectorAll('[data-remove-host]').forEach(b=>b.onclick=()=>{S.data.hosts.splice(Number(b.dataset.removeHost),1);setDirty();render()});
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
$('#publishBtn').onclick=async()=>{try{$('#publishBtn').disabled=true;await api('publish',{method:'POST',body:JSON.stringify(S.data)});S.dirty=false;$('#publishBtn').textContent='儲存並發布';notice('已 Commit 到 GitHub，等待 Cloudflare 部署')}catch(e){notice(e.message,true)}finally{$('#publishBtn').disabled=false}};
$('#logoutBtn').onclick=async()=>{await api('logout',{method:'POST'});showLogin()};
session();
