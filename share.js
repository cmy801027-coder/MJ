const L = window.LIFF_CONFIG || { shareLiffId:'YOUR_SHARE_LIFF_ID', hosts:[] };
const app = document.querySelector('#shareApp');
let liffReady = false;
let result = null;

function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function todayValue(){
  const d=new Date();
  const offset=d.getTimezoneOffset();
  return new Date(d.getTime()-offset*60000).toISOString().slice(0,10);
}

function decodeSharePayload(value){
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function loadResult(){
  result = null;

  // 優先從網址取得，避免不同 LIFF App 的 WebView 儲存空間彼此隔離。
  const encoded = new URLSearchParams(window.location.search).get('result');
  if(encoded){
    try {
      result = decodeSharePayload(encoded);
      localStorage.setItem('plastikQuizShareResult', JSON.stringify(result));
      return;
    } catch(error){
      console.warn('網址中的測驗結果解析失敗', error);
    }
  }

  // 備援：同一瀏覽器環境下再嘗試 localStorage。
  try { result=JSON.parse(localStorage.getItem('plastikQuizShareResult')||'null'); }
  catch { result=null; }
}

function render(message=''){
  if(!result){
    app.innerHTML=`<section class="panel"><div class="eyebrow">NO RESULT</div><h2 class="section-title">找不到測驗結果</h2><p class="desc">請先返回遊戲完成測驗，再從結果頁按下「傳送給主持人」。</p><a class="btn link-btn" href="./">返回遊戲</a></section>`;
    return;
  }
  app.innerHTML=`<section class="panel share-panel">
    <div class="eyebrow">DELIVER YOUR RESULT</div>
    <h2 class="section-title">把答案交給引路人</h2>
    <div class="share-result-mini">
      <img src="${escapeHtml(result.top.image)}" alt="${escapeHtml(result.top.name)}">
      <div><small>你的結果</small><strong>${escapeHtml(result.top.name)}</strong><span>${Number(result.top.pct)||0}% 共鳴</span></div>
    </div>
    <div class="fields">
      <div class="field"><label>玩家姓名 PLAYER NAME</label><input id="playerName" maxlength="40" placeholder="請輸入姓名或稱呼" autocomplete="name"></div>
      <div class="field"><label>遊玩日期 PLAY DATE</label><input id="playDate" type="date" value="${todayValue()}"></div>
    </div>
    <div class="eyebrow host-heading">SELECT HOST</div>
    <div class="host-grid">${(L.hosts||[]).map(h=>`<label class="host-card host-option"><input type="radio" name="host" value="${escapeHtml(h.id)}"><strong>${escapeHtml(h.displayName||h.name)}</strong><span>${escapeHtml(h.note||'主持人')}</span></label>`).join('')}</div>
    <div class="actions"><button class="btn" id="sendBtn">確認並開啟 LINE 傳送</button><a class="ghost link-btn" href="./">返回結果</a></div>
    <p class="share-status" id="status">${escapeHtml(message || '按下確認後，LINE 才會要求聊天室傳送權限並開啟收件人選擇器。')}</p>
  </section>`;
  document.querySelector('#sendBtn').addEventListener('click',sendResult);
}

async function init(){
  loadResult();
  render();
  if(!result) return;
  if(!window.liff){ render('LIFF SDK 載入失敗。'); return; }
  if(!L.shareLiffId || L.shareLiffId==='YOUR_SHARE_LIFF_ID'){ render('尚未設定分享 LIFF ID。'); return; }
  try{
    await liff.init({liffId:L.shareLiffId});
    liffReady=true;
    if(!liff.isLoggedIn()){
      liff.login({redirectUri:window.location.href});
    }
  }catch(e){
    console.error(e);
    render(`分享 LIFF 初始化失敗：${e?.message||'未知錯誤'}`);
  }
}

async function sendResult(){
  const status=document.querySelector('#status');
  const name=document.querySelector('#playerName').value.trim();
  const date=document.querySelector('#playDate').value;
  const hostId=document.querySelector('input[name="host"]:checked')?.value;
  const host=(L.hosts||[]).find(h=>h.id===hostId);

  if(!name){status.textContent='請先填寫玩家姓名。';document.querySelector('#playerName').focus();return;}
  if(!date){status.textContent='請先選擇遊玩日期。';return;}
  if(!host){status.textContent='請先選擇主持人。';return;}
  if(!liffReady){status.textContent='分享 LIFF 尚未完成初始化。';return;}
  if(!liff.isApiAvailable('shareTargetPicker')){status.textContent='目前環境不支援 LINE 分享對象選擇器，請使用 LINE App 開啟分享 LIFF。';return;}

  const message=[
    `【${result.title}｜角色測驗結果】`, '',
    `指定主持人：${host.displayName||host.name}`,
    `玩家：${name}`,
    `遊玩日期：${date}`,
    `選擇路線：${result.routeName}`,
    `結果角色：${result.top.name}`,
    `最高共鳴度：${result.top.pct}%`, '',
    '角色共鳴排行：',
    ...result.ranking.map((r,i)=>`${i+1}. ${r.name} ${r.pct}%`), '',
    '玩家留言：', result.note||'無'
  ].join('\n');

  status.textContent='正在開啟 LINE 收件人選擇器…';
  try{
    const response=await liff.shareTargetPicker([{type:'text',text:message}],{isMultiple:false});
    if(response){
      status.textContent=`已完成傳送。請確認剛才選擇的是「${host.displayName||host.name}」。`;
      localStorage.removeItem('plastikQuizShareResult');
    }else status.textContent='你取消了傳送，結果尚未送出。';
  }catch(e){
    console.error(e);
    status.textContent=`LINE 傳送失敗：${e?.message||'未知錯誤'}`;
  }
}

init();
