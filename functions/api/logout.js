import {json} from '../lib/response.js';import {clearCookie} from '../lib/auth.js';export async function onRequestPost(){return json({ok:true},200,{'Set-Cookie':clearCookie()})}
