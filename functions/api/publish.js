import {json} from '../lib/response.js';import {verifySession} from '../lib/auth.js';import {putFile,putBinary,deleteFile} from '../lib/github.js';
export async function onRequestPost({request,env}){if(!await verifySession(request,env))return json({error:'未登入'},401);try{const data=await request.json();const message=`content: update Assign Roles CMS ${new Date().toISOString()}`;
 await putFile(env,'data/index.json',JSON.stringify(data.index,null,2),message);
 await putFile(env,'data/settings.json',JSON.stringify(data.settings,null,2),message);
 await putFile(env,'data/hosts.json',JSON.stringify(data.hosts,null,2),message);
 for(const [id,s] of Object.entries(data.scripts)){const base=`data/scripts/${id}`;await putFile(env,`${base}/settings.json`,JSON.stringify(s.settings,null,2),message);await putFile(env,`${base}/story.json`,JSON.stringify(s.story,null,2),message);await putFile(env,`${base}/questions.json`,JSON.stringify(s.questions,null,2),message);await putFile(env,`${base}/characters.json`,JSON.stringify(s.characters,null,2),message)}
 const uploads=await env.ADMIN_UPLOADS.list();for(const item of uploads.objects){const obj=await env.ADMIN_UPLOADS.get(item.key);const path=obj.customMetadata?.path;if(path){await putBinary(env,path,await obj.text(),message)}await env.ADMIN_UPLOADS.delete(item.key)}
 return json({ok:true})}catch(e){return json({error:e.message},500)}}
