const enc=new TextEncoder();
function bytesToHex(bytes){return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function hmac(secret,value){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return bytesToHex(await crypto.subtle.sign('HMAC',key,enc.encode(value)))}
export async function createSession(env){const expiry=Date.now()+8*60*60*1000;const value=String(expiry);return `${value}.${await hmac(env.SESSION_SECRET,value)}`}
export async function verifySession(request,env){const cookie=request.headers.get('Cookie')||'';const token=cookie.match(/(?:^|;\s*)ar_admin=([^;]+)/)?.[1];if(!token)return false;const [expiry,sig]=token.split('.');if(!expiry||!sig||Number(expiry)<Date.now())return false;return sig===await hmac(env.SESSION_SECRET,expiry)}
export function sessionCookie(token){return `ar_admin=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`}
export function clearCookie(){return 'ar_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'}
export function safeEqual(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0}
