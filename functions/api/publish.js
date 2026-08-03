import { json } from '../lib/response.js';
import { verifySession } from '../lib/auth.js';
import {
  putFile,
  putBinary
} from '../lib/github.js';

async function publishPendingUploads(env, message) {
  if (!env.ADMIN_UPLOADS) {
    throw new Error(
      'Cloudflare 尚未綁定 ADMIN_UPLOADS KV Namespace'
    );
  }

  let cursor;
  let uploadedCount = 0;

  do {
    /*
     * KVNamespace.list() 回傳：
     * {
     *   keys: [...],
     *   list_complete: boolean,
     *   cursor?: string
     * }
     *
     * 不是 uploads.objects。
     */
    const page = await env.ADMIN_UPLOADS.list(
      cursor
        ? { cursor }
        : undefined
    );

    const keys = Array.isArray(page.keys)
      ? page.keys
      : [];

    for (const keyInfo of keys) {
      /*
       * list() 的 keyInfo 可能已包含 metadata，
       * 但仍使用 getWithMetadata() 取得最完整資料。
       */
      const entry =
        await env.ADMIN_UPLOADS.getWithMetadata(
          keyInfo.name,
          'text'
        );

      const contentBase64 = entry?.value;

      const metadata =
        entry?.metadata ||
        keyInfo.metadata ||
        {};

      const path = metadata.path;

      if (!contentBase64) {
        console.warn(
          `KV 暫存檔案內容不存在：${keyInfo.name}`
        );

        await env.ADMIN_UPLOADS.delete(
          keyInfo.name
        );

        continue;
      }

      if (!path) {
        console.warn(
          `KV 暫存檔案缺少 path metadata：${keyInfo.name}`
        );

        /*
         * 舊版 customMetadata 寫入的資料無法正確讀到 path。
         * 直接清除，避免每次發布都卡在同一筆壞資料。
         */
        await env.ADMIN_UPLOADS.delete(
          keyInfo.name
        );

        continue;
      }

      await putBinary(
        env,
        path,
        contentBase64,
        message
      );

      await env.ADMIN_UPLOADS.delete(
        keyInfo.name
      );

      uploadedCount += 1;
    }

    cursor = page.list_complete
      ? undefined
      : page.cursor;
  } while (cursor);

  return uploadedCount;
}

export async function onRequestPost({
  request,
  env
}) {
  if (!await verifySession(request, env)) {
    return json({ error: '未登入' }, 401);
  }

  try {
    const data = await request.json();

    if (
      !data ||
      !data.index ||
      !data.settings ||
      !Array.isArray(data.hosts) ||
      !data.scripts
    ) {
      return json({
        error: '發布資料格式不完整'
      }, 400);
    }

    const message =
      'content: update Assign Roles CMS ' +
      new Date().toISOString();

    await putFile(
      env,
      'data/index.json',
      JSON.stringify(data.index, null, 2),
      message
    );

    await putFile(
      env,
      'data/settings.json',
      JSON.stringify(data.settings, null, 2),
      message
    );

    await putFile(
      env,
      'data/hosts.json',
      JSON.stringify(data.hosts, null, 2),
      message
    );

    for (
      const [scriptId, scriptData]
      of Object.entries(data.scripts)
    ) {
      if (!scriptData) {
        continue;
      }

      const base =
        `data/scripts/${scriptId}`;

      await putFile(
        env,
        `${base}/settings.json`,
        JSON.stringify(
          scriptData.settings || {},
          null,
          2
        ),
        message
      );

      await putFile(
        env,
        `${base}/story.json`,
        JSON.stringify(
          scriptData.story || {},
          null,
          2
        ),
        message
      );

      await putFile(
        env,
        `${base}/questions.json`,
        JSON.stringify(
          scriptData.questions || [],
          null,
          2
        ),
        message
      );

      await putFile(
        env,
        `${base}/characters.json`,
        JSON.stringify(
          scriptData.characters || {
            male: [],
            female: []
          },
          null,
          2
        ),
        message
      );
    }

    const uploadedCount =
      await publishPendingUploads(
        env,
        message
      );

    return json({
      ok: true,
      uploadedCount
    });
  } catch (error) {
    console.error('publish error', error);

    return json({
      error:
        error?.message ||
        '發布失敗'
    }, 500);
  }
}
