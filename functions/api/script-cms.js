
const headers={"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
const bad=(msg,status=400)=>reply({error:msg},status);
const pathAllowed=p=>typeof p==="string"&&/^img\/劇本\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.(?:png|jpg|jpeg|webp)$/i.test(p);
const encode=s=>new TextEncoder().encode(s);
const bytes64=b=>{let r="";const bytes=new Uint8Array(b);for(let i=0;i<bytes.length;i+=8192)r+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(r)};
const gh=async(env,path,opts={})=>{
 const res=await fetch("https://api.github.com/repos/"+env.CMS_GITHUB_REPO.split("/").map(encodeURIComponent).join("/")+path,{
 method:opts.method||"GET",
 headers:{"Authorization":"Bearer "+env.CMS_GITHUB_TOKEN,"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","User-Agent":"MJlarp-cms","Content-Type":"application/json"},
 body:opts.body?JSON.stringify(opts.body):undefined
 });
 const result=await res.json().catch(()=>({}));
 if(!res.ok)throw new Error("GitHub "+res.status+": "+(result.message||"請檢查權限與儲存庫設定"));
 return result;
};
const extract=s=>{const m=s.match(/window\.SCRIPTS\s*=\s*(\[[\s\S]*?\])\s*;/);if(!m)throw Error("無法辨識 scripts.js 的 window.SCRIPTS");return {list:JSON.parse(m[1]),start:m.index,end:m.index+m[0].length}};
const readFile=async(env,name)=>{
 const res=await gh(env,"/contents/"+name+"?ref="+encodeURIComponent(env.CMS_GITHUB_BRANCH||"main"));
 if(!res.content)throw Error(name+" 不存在");
 const raw=atob(res.content.replace(/\s/g,""));
 return new TextDecoder().decode(Uint8Array.from(raw,c=>c.charCodeAt(0)));
};
const allowedString=(v,max=5000)=>typeof v==="string"&&v.length<=max;
const validate=(s,d)=>{
 if(!s||typeof s!=="object"||!d||typeof d!=="object")throw Error("資料格式錯誤");
 if(!/^[a-z0-9_-]{2,64}$/.test(s.id||""))throw Error("ID 僅能使用 2-64 位英數字、底線、連字號");
 if(!allowedString(s.name,100)||!s.name.trim())throw Error("劇本名稱必填");
 if(!Number.isInteger(s.players)||s.players<1||s.players>30)throw Error("人數必須是 1-30");
 if(typeof s.time!=="number"||s.time<=0||s.time>48)throw Error("時間格式不正確");
 if(!Number.isInteger(s.difficulty)||s.difficulty<0||s.difficulty>5)throw Error("難度為 0-5");
 if(!Array.isArray(s.types)||s.types.length>30||s.types.some(x=>!allowedString(x,60)))throw Error("標籤不正確");
 if(!Array.isArray(s.characters)||s.characters.length>40||s.characters.some(x=>!allowedString(x,100)))throw Error("角色名單不正確");
 if(!allowedString(s.playersLabel,80)||!allowedString(s.timeLabel,80)||!allowedString(s.youtube||"",300))throw Error("基本資料過長");
 if(!allowedString(d.story||"",20000)||!allowedString(d.notice||"",10000)||!allowedString(d.features||"",10000)||!allowedString(d.tagline||"",300))throw Error("介紹文字過長");
 if(d.characters!==undefined&&(!Array.isArray(d.characters)||d.characters.length>40||d.characters.some(x=>!x||!allowedString(x.name,100)||!allowedString(x.subtitle||"",300)||!allowedString(x.image||"",300))))throw Error("角色詳細資料格式錯誤");
 if(d.hosts!==undefined&&(!Array.isArray(d.hosts)||d.hosts.length>40||d.hosts.some(x=>!x||!allowedString(x.name,100)||!allowedString(x.subtitle||"",300)||!allowedString(x.image||"",300))))throw Error("主持人資料格式錯誤");
};
const auth=async(request,env)=>{
 const a=request.headers.get("Authorization")||"";
 const b="Bearer "+(env.CMS_ADMIN_PASSWORD||"");
 const ab=encode(a),bb=encode(b);
 if(!env.CMS_ADMIN_PASSWORD||ab.length!==bb.length)return false;
 let diff=0;for(let i=0;i<ab.length;i++)diff|=ab[i]^bb[i];
 return diff===0;
};
export async function onRequest({request,env}){
 if(!env.CMS_GITHUB_REPO||!env.CMS_GITHUB_TOKEN||!env.CMS_ADMIN_PASSWORD)return bad("缺少 CMS_GITHUB_REPO、CMS_GITHUB_TOKEN 或 CMS_ADMIN_PASSWORD 設定",503);
 if(!await auth(request,env))return bad("管理密碼不正確",401);
 try{
 if(request.method==="GET"){
  const [scripts,details]=await Promise.all([readFile(env,"scripts.js"),readFile(env,"script-details.json")]);
  return reply({scripts:extract(scripts).list,details:JSON.parse(details)});
 }
 if(request.method!=="POST")return bad("Method Not Allowed",405);
 const body=await request.json();
 if(!body||!body.script||!body.details)return bad("缺少劇本資料");
 const s=body.script,d=body.details;validate(s,d);
 const branch=env.CMS_GITHUB_BRANCH||"main";
 const ref=await gh(env,"/git/ref/heads/"+encodeURIComponent(branch));
 const commit=await gh(env,"/git/commits/"+ref.object.sha);
 const [original,detailText]=await Promise.all([readFile(env,"scripts.js"),readFile(env,"script-details.json")]);
 const parsed=extract(original),list=parsed.list;
 const old=list.findIndex(x=>x.id===s.id);
 if(old>=0&&body.mode!=="edit")return bad("此 ID 已存在，請使用編輯模式",409);
 if(old<0&&body.mode==="edit")return bad("找不到要編輯的劇本",404);
 const script={...s,file:"script.html?id="+s.id,reviewKey:s.reviewKey||s.name,theme:s.theme||"default"};
 if(old>=0)list[old]={...list[old],...script};else list.push(script);
 const updated=original.slice(0,parsed.start)+"window.SCRIPTS = "+JSON.stringify(list,null,2)+";"+original.slice(parsed.end);
 const all=JSON.parse(detailText);all[s.id]=d;
 const entries=[{path:"scripts.js",mode:"100644",type:"blob",content:updated},{path:"script-details.json",mode:"100644",type:"blob",content:JSON.stringify(all,null,2)+"\n"}];
 const images=Array.isArray(body.images)?body.images:[];
 if(images.length>45)return bad("單次最多 45 張圖片");
 for(const item of images){
  if(!pathAllowed(item.path))return bad("圖片路徑不正確");
  if(!/^[A-Za-z0-9+/]*={0,2}$/.test(item.base64||"")||item.base64.length>4200000)return bad("圖片過大或格式不正確（每張約 3MB 上限）");
  const blob=await gh(env,"/git/blobs",{method:"POST",body:{content:item.base64,encoding:"base64"}});
  entries.push({path:item.path,mode:"100644",type:"blob",sha:blob.sha});
 }
 const tree=await gh(env,"/git/trees",{method:"POST",body:{base_tree:commit.tree.sha,tree:entries}});
 const next=await gh(env,"/git/commits",{method:"POST",body:{message:"CMS: "+(old>=0?"更新 ":"新增 ")+s.name,tree:tree.sha,parents:[ref.object.sha]}});
 await gh(env,"/git/refs/heads/"+encodeURIComponent(branch),{method:"PATCH",body:{sha:next.sha,force:false}});
 return reply({ok:true,sha:next.sha,url:"/script.html?id="+encodeURIComponent(s.id),message:"已寫入 GitHub，等待 Cloudflare Pages 部署"});
 }catch(e){return bad(e.message||"儲存失敗",500)}
}
