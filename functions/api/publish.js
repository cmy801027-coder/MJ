import {
  json
} from '../lib/response.js';

import {
  verifySession
} from '../lib/auth.js';

import {
  commitFiles
} from '../lib/github.js';

function jsonFile(
  path,
  value
) {
  return {
    path,
    content:
      JSON.stringify(
        value,
        null,
        2
      ) + '\n',
    encoding: 'utf-8'
  };
}

async function collectUploads(
  env
) {
  if (!env.ADMIN_UPLOADS) {
    throw new Error(
      'Cloudflare 尚未綁定 ADMIN_UPLOADS KV Namespace'
    );
  }

  const files = [];
  const keysToDelete = [];

  let cursor;

  do {
    const page =
      await env.ADMIN_UPLOADS.list(
        cursor
          ? { cursor }
          : undefined
      );

    const keys =
      Array.isArray(page.keys)
        ? page.keys
        : [];

    for (const keyInfo of keys) {
      const entry =
        await env.ADMIN_UPLOADS
          .getWithMetadata(
            keyInfo.name,
            'text'
          );

      const base64 =
        entry?.value;

      const metadata =
        entry?.metadata ||
        keyInfo.metadata ||
        {};

      keysToDelete.push(
        keyInfo.name
      );

      if (
        !base64 ||
        !metadata.path
      ) {
        continue;
      }

      files.push({
        path:
          metadata.path,
        content:
          base64,
        encoding:
          'base64'
      });
    }

    cursor =
      page.list_complete
        ? undefined
        : page.cursor;
  } while (cursor);

  return {
    files,
    keysToDelete
  };
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

  try {
    const data =
      await request.json();

    if (
      !data?.index ||
      !data?.settings ||
      !Array.isArray(data?.hosts) ||
      !data?.scripts ||
      typeof data.scripts !== 'object'
    ) {
      return json({
        error:
          '發布資料格式不完整'
      }, 400);
    }

    const files = [
      jsonFile(
        'data/index.json',
        data.index
      ),
      jsonFile(
        'data/settings.json',
        data.settings
      ),
      jsonFile(
        'data/hosts.json',
        data.hosts
      )
    ];

    for (
      const [
        scriptId,
        scriptData
      ] of Object.entries(
        data.scripts
      )
    ) {
      if (!scriptData) {
        continue;
      }

      const base =
        `data/scripts/${scriptId}`;

      files.push(
        jsonFile(
          `${base}/settings.json`,
          scriptData.settings || {}
        ),
        jsonFile(
          `${base}/story.json`,
          scriptData.story || {}
        ),
        jsonFile(
          `${base}/questions.json`,
          scriptData.questions || []
        ),
        jsonFile(
          `${base}/characters.json`,
          scriptData.characters || {
            male: [],
            female: []
          }
        )
      );
    }

    const pending =
      await collectUploads(
        env
      );

    files.push(
      ...pending.files
    );

    const result =
      await commitFiles(
        env,
        files,
        'content: publish Assign Roles CMS ' +
        new Date().toISOString()
      );

    /*
     * 只有 GitHub Commit 成功後，
     * 才刪除 KV 暫存檔。
     */
    for (
      const key
      of pending.keysToDelete
    ) {
      await env.ADMIN_UPLOADS
        .delete(key);
    }

    return json({
      ok: true,
      changed:
        result.changed,
      commitSha:
        result.commitSha || null,
      fileCount:
        result.fileCount || 0,
      uploadedCount:
        pending.files.length,
      message:
        result.changed
          ? `已將 ${pending.files.length} 個素材與 JSON 合併為 1 個 Commit`
          : '內容沒有變更，未建立 Commit'
    });
  } catch (error) {
    console.error(
      'publish error',
      error
    );

    return json({
      error:
        error?.message ||
        '發布失敗'
    }, 500);
  }
}
