
(()=>{
'use strict';

const $ = id => document.getElementById(id);

const esc = s => String(s ?? '').replace(
  /[&<>"']/g,
  c => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[c])
);

let password = '';
let scripts = [];
let details = {};
let mode = 'new';
let current = null;

const basicFields = [
  'id','name','players','playersLabel','time',
  'tagline','story','features','notice','bookingNote','priceLabel','timeLabel'
];

const allowedTypes = [
  '推理','情感','機制','恐怖','歡樂',
  '古風','歐式','民國','科幻','日式','陣營'
];

const show = (id,message,ok=false) => {
  $(id).textContent = message;
  $(id).className = ok ? 'ok' : 'error';
};

const request = async (method,body) => {
  const r = await fetch('/api/script-cms',{
    method,
    headers:{
      'Authorization':'Bearer '+password,
      ...(body ? {'Content-Type':'application/json'} : {})
    },
    body:body ? JSON.stringify(body) : undefined,
    cache:'no-store'
  });

  const data = await r.json().catch(()=>({
    error:'伺服器未回傳 JSON，請確認 Functions 已部署'
  }));

  if(!r.ok){
    throw Error(data.error || `HTTP ${r.status}`);
  }

  return data;
};

const field = (id,val) => {
  $(id).value = val ?? '';
};

function getCheckedTypes(){
  return Array.from(
    document.querySelectorAll('input[name="scriptType"]:checked')
  ).map(input=>input.value);
}

function setCheckedTypes(types=[]){
  const selected = new Set(Array.isArray(types) ? types : []);

  document.querySelectorAll('input[name="scriptType"]').forEach(input=>{
    input.checked = selected.has(input.value);
  });

  const legacy = Array.from(selected).filter(
    type=>!allowedTypes.includes(type)
  );

  const hint = $('legacyTypesHint');

  if(legacy.length){
    hint.textContent =
      '此劇本原有其他類型：'+legacy.join('、')+
      '。請改選新版類型，儲存時統一使用上述 11 種。';
    hint.classList.remove('hidden');
  }else{
    hint.textContent = '';
    hint.classList.add('hidden');
  }
}

function row(kind,item={}){
  const el = document.createElement('div');

  el.className = 'item';
  el.dataset.kind = kind;
  el.dataset.image = item.image || '';

  el.innerHTML = `
    <div class="grid">
      <div>
        <label>名稱 *</label>
        <input class="person-name" maxlength="100"
          value="${esc(item.name || '')}">
      </div>
      <div>
        <label>身分／簡介</label>
        <input class="person-subtitle" maxlength="300"
          value="${esc(item.subtitle || '')}">
      </div>
    </div>
    <label>圖片</label>
    <input type="file" class="person-file"
      accept="image/png,image/jpeg,image/webp">
    <small>${esc(item.image || '尚未上傳')}</small>
    <div class="row">
      <button class="secondary remove" type="button">
        移除此項
      </button>
    </div>
  `;

  el.querySelector('.remove').onclick = ()=>el.remove();

  (kind === 'host' ? $('hosts') : $('characters')).append(el);
}

function newItem(){
  mode = 'new';
  current = null;

  $('form').reset();

  for(const f of basicFields){
    field(f,'');
  }

  field('players',6);
  field('time',4);
  field('store','敏捷私團');

  setCheckedTypes([]);
  $('allowCrossGender').checked = false;

  $('id').disabled = false;
  $('characters').innerHTML = '';
  $('hosts').innerHTML = '';

  $('posterPath').textContent = '尚未上傳';
  $('posterPreview').classList.add('hidden');
  $('posterPreview').removeAttribute('src');

  $('existing').value = '';
  show('status','');
}

function editItem(id){
  const s = scripts.find(x=>x.id === id);

  if(!s){
    return newItem();
  }

  mode = 'edit';
  current = s;

  const d = details[id] || {};

  for(const f of [
    'id','name','players','playersLabel','time'
  ]){
    field(f,s[f]);
  }

  field('store',s.store === '敏捷私團' ? '敏捷私團' : '其他店家');
  field('priceLabel',s.priceLabel || '');
  field('timeLabel',s.timeLabel || '');
  setCheckedTypes(s.types || []);

  $('allowCrossGender').checked =
    s.allowCrossGender === true ||
    d.allowCrossGender === true;

  for(const f of [
    'tagline','story','features','notice','bookingNote'
  ]){
    field(f,d[f] ?? '');
  }

  $('id').disabled = true;

  $('posterPath').textContent = s.poster || '尚未上傳';
  $('posterPreview').classList.add('hidden');

  if(s.poster){
    $('posterPreview').src = '../'+s.poster;
    $('posterPreview').classList.remove('hidden');
  }else{
    $('posterPreview').removeAttribute('src');
  }

  $('posterFile').value = '';
  $('characters').innerHTML = '';
  $('hosts').innerHTML = '';

  const map = new Map(
    (d.characters || []).map(x=>[x.name,x])
  );

  for(const name of s.characters || []){
    row('char',map.get(name) || {name});
  }

  for(const h of d.hosts || []){
    row('host',h);
  }

  show('status','');
}

async function load(){
  const data = await request('GET');

  scripts = data.scripts;
  details = data.details;

  $('existing').innerHTML =
    '<option value="">＋ 新增劇本</option>'+
    scripts.map(s=>`
      <option value="${esc(s.id)}">
        ${esc(s.name)} (${esc(s.id)})
      </option>
    `).join('');

  $('login').classList.add('hidden');
  $('editor').classList.remove('hidden');

  newItem();
}

$('loginBtn').onclick = async ()=>{
  password = $('password').value;

  if(!password){
    return show('loginStatus','請輸入密碼');
  }

  $('loginBtn').disabled = true;
  show('loginStatus','讀取中…',true);

  try{
    await load();
    $('password').value = '';
  }catch(e){
    show('loginStatus',e.message);
    password = '';
  }finally{
    $('loginBtn').disabled = false;
  }
};

$('existing').onchange = e =>
  e.target.value ? editItem(e.target.value) : newItem();

$('newBtn').onclick = ()=>newItem();

$('refreshBtn').onclick = async ()=>{
  if(!confirm('重新載入會放棄未儲存修改，確定？')){
    return;
  }

  try{
    await load();
  }catch(e){
    show('status',e.message);
  }
};

$('addChar').onclick = ()=>row('char');
$('addHost').onclick = ()=>row('host');

function imageUpload(file,path){
  return new Promise((resolve,reject)=>{
    if(!file){
      return resolve(null);
    }

    if(![
      'image/png','image/jpeg','image/webp'
    ].includes(file.type)){
      return reject(Error('只接受 PNG、JPG、WebP'));
    }

    if(file.size > 3000000){
      return reject(Error(file.name+' 超過 3MB'));
    }

    const reader = new FileReader();

    reader.onerror = ()=>
      reject(Error('無法讀取圖片'));

    reader.onload = ()=>resolve({
      path,
      base64:String(reader.result).split(',')[1]
    });

    reader.readAsDataURL(file);
  });
}

$('form').onsubmit = async e=>{
  e.preventDefault();

  const btn = $('saveBtn');
  btn.disabled = true;

  show('status','正在驗證資料並上傳…',true);

  try{
    const id = $('id').value.trim();

    if(!/^[a-z0-9_-]{2,64}$/.test(id)){
      throw Error(
        'ID 只能使用英文小寫、數字、底線或連字號'
      );
    }

    const chars = [];
    const hosts = [];
    const images = [];

    const ext = f =>
      f.type === 'image/png' ? 'png' :
      f.type === 'image/webp' ? 'webp' : 'jpg';

    async function collect(container,dest,prefix){
      for(const el of container.querySelectorAll('.item')){
        const name = el.querySelector(
          '.person-name'
        ).value.trim();

        if(!name){
          throw Error('角色／主持人名稱不可空白');
        }

        const subtitle = el.querySelector(
          '.person-subtitle'
        ).value.trim();

        const file = el.querySelector(
          '.person-file'
        ).files[0];

        let image = el.dataset.image || '';

        if(file){
          image =
            `img/劇本/${id}/${prefix}-${dest.length+1}.${ext(file)}`;

          images.push(
            await imageUpload(file,image)
          );
        }

        dest.push({name,subtitle,image});
      }
    }

    await collect($('characters'),chars,'character');
    await collect($('hosts'),hosts,'host');

    const poster = $('posterFile').files[0];
    let posterPath = current?.poster || '';

    if(poster){
      posterPath = `img/劇本/${id}/poster.${ext(poster)}`;
      images.push(
        await imageUpload(poster,posterPath)
      );
    }

    const selectedTypes = getCheckedTypes();

    if(!selectedTypes.length){
      throw Error('請至少勾選一個劇本類型');
    }

    const types = selectedTypes.filter(type=>allowedTypes.includes(type));

    // 舊版 Cloudflare API 仍要求 difficulty
    // 新增劇本使用 0，編輯時保留原值
    const existingDifficulty = current?.difficulty;

    const difficulty =
      Number.isInteger(existingDifficulty) &&
      existingDifficulty >= 0 &&
      existingDifficulty <= 5
        ? existingDifficulty
        : 0;

    const name = $('name').value.trim();

    // 保留既有劇本的其他欄位
    const script = {
      ...(current || {}),
      id,
      name,
      players:Number($('players').value),
      playersLabel:$('playersLabel').value.trim(),
      time:Number($('time').value),
      timeLabel:$('timeLabel').value.trim() || $('time').value+'小時',
      priceLabel:$('priceLabel').value.trim(),
      store:$('store').value,
      difficulty,
      types,
      allowCrossGender:$('allowCrossGender').checked,
      characters:chars.map(x=>x.name),
      poster:posterPath,
      theme:current?.theme || 'default',
      reviewKey:current?.reviewKey || name,

      // 保留原有 YouTube 資料，不再提供輸入
      youtube:current?.youtube || ''
    };

    const previousDetails = details[id] || {};

    const extra = {
      ...previousDetails,
      tagline:$('tagline').value.trim(),
      story:$('story').value,
      features:$('features').value,
      notice:$('notice').value,
      bookingNote:$('bookingNote').value,
      allowCrossGender:$('allowCrossGender').checked,
      characters:chars,
      hosts
    };

    const result = await request('POST',{
      mode,
      script,
      details:extra,
      images
    });

    show(
      'status',
      result.message+
      '。預覽：'+location.origin+result.url,
      true
    );

    // 重新讀取 GitHub 最新資料
    await load();

    $('existing').value = id;
    editItem(id);

  }catch(err){
    show('status',err.message);
  }finally{
    btn.disabled = false;
  }
};

})();
