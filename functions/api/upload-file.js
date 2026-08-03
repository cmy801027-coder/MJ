import { json } from '../lib/response.js';
import { verifySession } from '../lib/auth.js';

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const ALLOWED_EXTENSIONS = {
  image: new Set([
    'jpg',
    'jpeg',
    'png',
    'webp',
    'gif'
  ]),
  music: new Set([
    'mp3',
    'wav',
    'ogg',
    'm4a',
    'aac'
  ]),
  bgm: new Set([
    'mp3',
    'wav',
    'ogg',
    'm4a',
    'aac'
  ])
};

function clean(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getExtension(fileName) {
  const parts = String(fileName).split('.');

  return parts.length > 1
    ? parts.pop().toLowerCase()
    : '';
}

function estimateBase64Bytes(base64) {
  const normalized =
    String(base64).replace(/\s/g, '');

  const padding =
    normalized.endsWith('==')
      ? 2
      : normalized.endsWith('=')
        ? 1
        : 0;

  return Math.floor(
    normalized.length * 3 / 4
  ) - padding;
}

export async function onRequestPost({
  request,
  env
}) {
  if (
    !await verifySession(
      request,
      env
    )
  ) {
    return json({
      error: '未登入'
    }, 401);
  }

  if (!env.ADMIN_UPLOADS) {
    return json({
      error:
        'Cloudflare 尚未綁定 ADMIN_UPLOADS KV Namespace'
    }, 500);
  }

  try {
    const {
      scriptId,
      kind,
      fileName,
      contentBase64
    } = await request.json();

    if (
      !scriptId ||
      !kind ||
      !fileName ||
      !contentBase64
    ) {
      return json({
        error: '缺少上傳參數'
      }, 400);
    }

    if (!ALLOWED_EXTENSIONS[kind]) {
      return json({
        error: '不支援的檔案類型'
      }, 400);
    }

    const extension =
      getExtension(fileName);

    if (
      !ALLOWED_EXTENSIONS[kind]
        .has(extension)
    ) {
      return json({
        error:
          `不支援 .${extension || '未知'} 格式`
      }, 400);
    }

    const byteSize =
      estimateBase64Bytes(
        contentBase64
      );

    if (byteSize <= 0) {
      return json({
        error: '檔案內容為空'
      }, 400);
    }

    if (byteSize > MAX_FILE_SIZE) {
      return json({
        error:
          '檔案超過 20 MB，請先壓縮後再上傳'
      }, 413);
    }

    const folder =
      kind === 'image'
        ? 'characters'
        : kind === 'music'
          ? 'character-music'
          : 'bgm';

    const safeScriptId =
      clean(scriptId);

    const safeFileName =
      clean(fileName) ||
      `upload.${extension}`;

    const path =
      `assets/scripts/${safeScriptId}/${folder}/` +
      `${Date.now()}-${safeFileName}`;

    const uploadKey =
      crypto.randomUUID();

    /*
     * KV 只作為發布前暫存。
     * 真正的永久檔案會在 publish.js 中
     * 一次 Commit 到 GitHub。
     */
    await env.ADMIN_UPLOADS.put(
      uploadKey,
      contentBase64,
      {
        metadata: {
          path,
          kind,
          fileName: safeFileName,
          scriptId: safeScriptId,
          byteSize,
          createdAt:
            new Date().toISOString()
        },
        expirationTtl:
          24 * 60 * 60
      }
    );

    return json({
      ok: true,
      path,
      uploadKey,
      byteSize,
      pending: true
    });
  } catch (error) {
    console.error(
      'upload-file error',
      error
    );

    return json({
      error:
        error?.message ||
        '檔案上傳失敗'
    }, 500);
  }
}
