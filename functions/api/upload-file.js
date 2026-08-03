import { json } from '../lib/response.js';
import { verifySession } from '../lib/auth.js';

function clean(value) {
  return String(value)
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-');
}

export async function onRequestPost({ request, env }) {
  if (!await verifySession(request, env)) {
    return json({ error: '未登入' }, 401);
  }

  if (!env.ADMIN_UPLOADS) {
    return json({
      error: 'Cloudflare 尚未綁定 ADMIN_UPLOADS KV Namespace'
    }, 500);
  }

  try {
    const {
      scriptId,
      kind,
      fileName,
      contentBase64
    } = await request.json();

    if (!scriptId || !kind || !fileName || !contentBase64) {
      return json({ error: '缺少上傳參數' }, 400);
    }

    const allowedKinds = new Set([
      'image',
      'music',
      'bgm'
    ]);

    if (!allowedKinds.has(kind)) {
      return json({ error: '不支援的檔案類型' }, 400);
    }

    const folder =
      kind === 'image'
        ? 'characters'
        : kind === 'music'
          ? 'character-music'
          : 'bgm';

    const path =
      `assets/scripts/${clean(scriptId)}/${folder}/` +
      `${Date.now()}-${clean(fileName)}`;

    const uploadKey = crypto.randomUUID();

    /*
     * Cloudflare KV 的 metadata 必須使用 options.metadata。
     * 不能使用 customMetadata。
     */
    await env.ADMIN_UPLOADS.put(
      uploadKey,
      contentBase64,
      {
        metadata: {
          path,
          kind,
          fileName: clean(fileName),
          scriptId: clean(scriptId),
          createdAt: new Date().toISOString()
        }
      }
    );

    return json({
      ok: true,
      path,
      uploadKey
    });
  } catch (error) {
    console.error('upload-file error', error);

    return json({
      error: error?.message || '檔案上傳失敗'
    }, 500);
  }
}
