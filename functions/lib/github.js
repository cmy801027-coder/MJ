const api='https://api.github.com';
function headers(env){return {'Authorization':`Bearer ${env.GITHUB_TOKEN}`,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'assign-roles-cms'}}
export async function getFile(env,path){
 const url=`${api}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${encodeURI(path)}?ref=${encodeURIComponent(env.GITHUB_BRANCH||'main')}`;
 const r=await fetch(url,{headers:headers(env)});if(r.status===404)return null;if(!r.ok)throw new Error(`GitHub read ${path}: ${r.status} ${await r.text()}`);return r.json()
}
export async function readJson(env,path){const f=await getFile(env,path);if(!f)throw new Error(`找不到 ${path}`);const text=decodeURIComponent(escape(atob(f.content.replace(/\n/g,''))));return JSON.parse(text)}
export async function putFile(env,path,content,message){
 const old=await getFile(env,path);const body={message,content:btoa(unescape(encodeURIComponent(content))),branch:env.GITHUB_BRANCH||'main'};if(old?.sha)body.sha=old.sha;
 const r=await fetch(`${api}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${encodeURI(path)}`,{method:'PUT',headers:{...headers(env),'Content-Type':'application/json'},body:JSON.stringify(body)});
 if(!r.ok)throw new Error(`GitHub write ${path}: ${r.status} ${await r.text()}`);return r.json()
}
export async function putBinary(env,path,base64,message){
 const old=await getFile(env,path);const body={message,content:base64,branch:env.GITHUB_BRANCH||'main'};if(old?.sha)body.sha=old.sha;
 const r=await fetch(`${api}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${encodeURI(path)}`,{method:'PUT',headers:{...headers(env),'Content-Type':'application/json'},body:JSON.stringify(body)});
 if(!r.ok)throw new Error(`GitHub upload ${path}: ${r.status} ${await r.text()}`);return r.json()
}
export async function deleteFile(env,path,message){
 const old=await getFile(env,path);if(!old)return;
 const r=await fetch(`${api}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${encodeURI(path)}`,{method:'DELETE',headers:{...headers(env),'Content-Type':'application/json'},body:JSON.stringify({message,sha:old.sha,branch:env.GITHUB_BRANCH||'main'})});
 if(!r.ok)throw new Error(`GitHub delete ${path}: ${r.status} ${await r.text()}`)
}
