import {
  json
} from '../lib/response.js';

import {
  verifySession
} from '../lib/auth.js';

import {
  commitFiles
} from '../lib/github.js';

async function collectPendingUploads(
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
        await env.ADMIN_UPLOADS.getWithMetadata(
          keyInfo.name,
          'text'
        );

      const contentBase64 =
        entry?.value;

      const metadata =
        entry?.metadata ||
        keyInfo.metadata ||
        {};

      /*
       * 壞掉或舊版格式的暫存資料，不應卡住整次發布。
       * 稍後直接從 KV 清除。
       */
      if (
        !contentBase64 ||
        !metadata.path
      ) {
        keysToDelete.push(
          keyInfo.name
        );

        continue;
      }

      files.push({
        path: metadata.path,
        content: contentBase64,
        encoding: 'base64'
      });

      keysToDelete.push(
        keyInfo.name
      );
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

function makeJsonFile(
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
      !data ||
      !data.index ||
      !data.settings ||
      !Array.isArray(data.hosts) ||
      !data.scripts ||
      typeof data.scripts !== 'object'
    ) {
      return json({
        error:
          '發布資料格式不完整'
      }, 400);
    }

    /*
     * 所有 JSON 先放進同一個檔案陣列，
     * 不再逐檔呼叫 GitHub Contents API。
     */
    const files = [
      makeJsonFile(
        'data/index.json',
        data.index
      ),
      makeJsonFile(
        'data/settings.json',
        data.settings
      ),
      makeJsonFile(
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
        makeJsonFile(
          `${base}/settings.json`,
          scriptData.settings || {}
        ),
        makeJsonFile(
          `${base}/story.json`,
          scriptData.story || {}
        ),
        makeJsonFile(
          `${base}/questions.json`,
          scriptData.questions || []
        ),
        makeJsonFile(
          `${base}/characters.json`,
          scriptData.characters || {
            male: [],
            female: []
          }
        )
      );
    }

    /*
     * 圖片與 MP3 也一起加入相同 Commit。
     */
    const pendingUploads =
      await collectPendingUploads(
        env
      );

    files.push(
      ...pendingUploads.files
    );

    const message =
      'content: publish Assign Roles CMS ' +
      new Date().toISOString();

    /*
     * 無論幾個 JSON、幾張圖、幾首 MP3，
     * 此處最多只會建立一個 Git commit。
     */
    const result =
      await commitFiles(
        env,
        files,
        message
      );

    /*
     * GitHub 批次作業成功後才清除 KV。
     * 即使內容完全相同、沒有建立 Commit，
     * 暫存檔也已確認存在於生成後的 tree 或內容相同，
     * 因此可以安全清除。
     */
    for (
      const key
      of pendingUploads.keysToDelete
    ) {
      await env.ADMIN_UPLOADS.delete(
        key
      );
    }

    return json({
      ok: true,
      changed: result.changed,
      commitSha:
        result.commitSha || null,
      fileCount:
        result.fileCount || 0,
      uploadedCount:
        pendingUploads.files.length,
      message:
        result.changed
          ? '已建立 1 個 Commit'
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
