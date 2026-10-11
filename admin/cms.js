(()=>{
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let password='',scripts=[],details={},mode='new',current=null;
const fields=['id','name','players','playersLabel','time','difficulty','types','tagline','youtube','story','features','notice','bookingNote'];
const show=(id,message,ok=false)=>{$(id).textContent=message;$(id).className=ok?'ok':'error'};
const request=async(method,body)=>{
 const r=await fetch('/api/script-cms',{method,headers:{'Authorization':'Bearer '+password,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});
 const data=await r.json().catch(()=>({error:'伺服器未回傳 JSON，請確認 Functions 已部署'}));
 if(!r.ok)throw Error(data.error||`HTTP ${r.status}`);
 return data;
};
const field=(id,val)=>{$(id).value=val??''};
const slug=s=>String(s||'').trim().toLowerCase().replace(/[^a-z0-9_-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
function row(kind,item={}){
 const el=document.createElement('div');el.className='item';el.dataset.kind=kind;el.dataset.image=item.image||'';
 el.innerHTML=`<div class="grid"><div><label>名稱 *</label><input class="person-name" maxlength="100" value="${esc(item.name||'')}"></div><div><label>身分／簡介</label><input class="person-subtitle" maxlength="300" value="${esc(item.subtitle||'')}"></div></div><label>圖片</label><input type="file" class="person-file" accept="image/png,image/jpeg,image/webp"><small>${esc(item.image||'尚未上傳')}</small><div class="row"><button class="secondary remove" type="button">移除此項</button></div>`;
 el.querySelector('.remove').onclick=()=>el.remove();
 (kind==='host'?$('hosts'):$('characters')).append(el);
}
function newItem(){
 mode='new';current=null;
 $('form').reset();for(const f of fields)if(!['players','time','difficulty'].includes(f))field(f,'');
 field('players',6);field('time',4);field('difficulty',3);
 $('id').disabled=false;$('characters').innerHTML='';$('hosts').innerHTML='';
 $('posterPath').textContent='尚未上傳';$('posterPreview').classList.add('hidden');
 $('existing').value='';show('status','');
}
function editItem(id){
 const s=scripts.find(x=>x.id===id);if(!s)return newItem();
 mode='edit';current=s;const d=details[id]||{};
 for(const f of ['id','name','players','playersLabel','time','difficulty'])field(f,s[f]);
 field('types',(s.types||[]).join(', '));field('youtube',s.youtube||d.youtube||'');
 for(const f of ['tagline','story','features','notice','bookingNote'])field(f,d[f]||'');
 $('id').disabled=true;
 $('posterPath').textContent=s.poster||'尚未上傳';
 $('posterPreview').classList.add('hidden');
 if(s.poster){$('posterPreview').src='../'+s.poster;$('posterPreview').classList.remove('hidden')}
 $('posterFile').value='';$('characters').innerHTML='';$('hosts').innerHTML='';
 const map=new Map((d.characters||[]).map(x=>[x.name,x]));
 for(const name of s.characters||[])row('char',map.get(name)||{name});
 for(const h of d.hosts||[])row('host',h);
 show('status','');
}
async function load(){
 const d=await request('GET');scripts=d.scripts;details=d.details;
 $('existing').innerHTML='<option value="">＋ 新增劇本</option>'+scripts.map(s=>`<option value="${esc(s.id)}">${esc(s.name)} (${esc(s.id)})</option>`).join('');
 $('login').classList.add('hidden');$('editor').classList.remove('hidden');newItem();
}
$('loginBtn').onclick=async()=>{
 password=$('password').value;if(!password)return show('loginStatus','請輸入密碼');
 $('loginBtn').disabled=true;show('loginStatus','讀取中…',true);
 try{await load();$('password').value=''}catch(e){show('loginStatus',e.message);password=''}
 finally{$('loginBtn').disabled=false}
};
$('existing').onchange=e=>e.target.value?editItem(e.target.value):newItem();
$('newBtn').onclick=()=>newItem();
$('refreshBtn').onclick=async()=>{if(!confirm('重新載入會放棄未儲存修改，確定？'))return;try{await load()}catch(e){show('status',e.message)}};
$('addChar').onclick=()=>row('char');
$('addHost').onclick=()=>row('host');
function imageUpload(file,path){
 return new Promise((resolve,reject)=>{
  if(!file)return resolve(null);
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))return reject(Error('只接受 PNG、JPG、WebP'));
  if(file.size>3000000)return reject(Error(file.name+' 超過 3MB'));
  const r=new FileReader();r.onerror=()=>reject(Error('無法讀取圖片'));r.onload=()=>resolve({path,base64:String(r.result).split(',')[1]});r.readAsDataURL(file);
 });
}
$('form').onsubmit=async e=>{
 e.preventDefault();const btn=$('saveBtn');btn.disabled=true;show('status','正在驗證資料並上傳…',true);
 try{
  const id=$('id').value.trim();if(!/^[a-z0-9_-]{2,64}$/.test(id))throw Error('ID 只能使用英文小寫、數字、底線或連字號');
  const chars=[],hosts=[],images=[];
  const ext=f=>f.type==='image/png'?'png':f.type==='image/webp'?'webp':'jpg';
  async function collect(container,dest,prefix){
   for(const el of container.querySelectorAll('.item')){
    const name=el.querySelector('.person-name').value.trim();if(!name)throw Error('角色／主持人名稱不可空白');
    const subtitle=el.querySelector('.person-subtitle').value.trim();
    const file=el.querySelector('.person-file').files[0];
    let image=el.dataset.image||'';
    if(file){image=`img/劇本/${id}/${prefix}-${dest.length+1}.${ext(file)}`;images.push(await imageUpload(file,image))}
    dest.push({name,subtitle,image});
   }
  }
  await collect($('characters'),chars,'character');
  await collect($('hosts'),hosts,'host');
  const poster=$('posterFile').files[0];
  let posterPath=current?.poster||'';
  if(poster){posterPath=`img/劇本/${id}/poster.${ext(poster)}`;images.push(await imageUpload(poster,posterPath))}
  const types=$('types').value.split(/[,，、]/).map(x=>x.trim()).filter(Boolean);
  if(!types.length)throw Error('請至少填寫一個劇本類型');
  const script={id,name:$('name').value.trim(),players:Number($('players').value),playersLabel:$('playersLabel').value.trim(),time:Number($('time').value),timeLabel:$('time').value+'小時',difficulty:Number($('difficulty').value),types,characters:chars.map(x=>x.name),youtube:$('youtube').value.trim(),poster:posterPath,theme:current?.theme||'default',reviewKey:current?.reviewKey||$('name').value.trim()};
  const extra={tagline:$('tagline').value.trim(),story:$('story').value,features:$('features').value,notice:$('notice').value,bookingNote:$('bookingNote').value,characters:chars,hosts};
  const result=await request('POST',{mode,script,details:extra,images});
  show('status',result.message+'。預覽：'+location.origin+result.url,true);
  await load();$('existing').value=id;editItem(id);
 }catch(err){show('status',err.message)}
 finally{btn.disabled=false}
};
})();
