import {json} from '../lib/response.js';import {createSession,sessionCookie,safeEqual} from '../lib/auth.js';
export async function onRequestPost({request,env}){const {password}=await request.json();if(!safeEqual(password||'',env.ADMIN_PASSWORD||''))return json({error:'密碼錯誤'},401);const token=await createSession(env);return json({ok:true},200,{'Set-Cookie':sessionCookie(token)})}
