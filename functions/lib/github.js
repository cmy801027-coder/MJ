const API = 'https://api.github.com';

function githubHeaders(env) {
  return {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'assign-roles-cms'
  };
}

async function githubRequest(
  env,
  path,
  options = {}
) {
  const response = await fetch(
    `${API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}${path}`,
    {
      ...options,
      headers: {
        ...githubHeaders(env),
        ...(options.body
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...(options.headers || {})
      }
    }
  );

  if (!response.ok) {
    const details = await response.text();

    throw new Error(
      `GitHub API ${options.method || 'GET'} ${path}: ` +
      `${response.status} ${details}`
    );
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function decodeBase64Utf8(value) {
  const binary = atob(
    String(value).replace(/\n/g, '')
  );

  const bytes = Uint8Array.from(
    binary,
    character => character.charCodeAt(0)
  );

  return new TextDecoder().decode(bytes);
}

export async function getFile(
  env,
  path
) {
  const branch =
    env.GITHUB_BRANCH || 'main';

  const encodedPath = path
    .split('/')
    .map(encodeURIComponent)
    .join('/');

  const response = await fetch(
    `${API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}` +
      `/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`,
    {
      headers: githubHeaders(env)
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `GitHub read ${path}: ` +
      `${response.status} ${await response.text()}`
    );
  }

  return response.json();
}

export async function readJson(
  env,
  path
) {
  const file = await getFile(env, path);

  if (!file) {
    throw new Error(`找不到 ${path}`);
  }

  return JSON.parse(
    decodeBase64Utf8(file.content)
  );
}

/**
 * 將多個檔案合併為一個 Git commit。
 *
 * files:
 * [
 *   {
 *     path: "data/index.json",
 *     content: "...UTF-8 text...",
 *     encoding: "utf-8"
 *   },
 *   {
 *     path: "assets/image.jpg",
 *     content: "...base64...",
 *     encoding: "base64"
 *   }
 * ]
 */
export async function commitFiles(
  env,
  files,
  message
) {
  const branch =
    env.GITHUB_BRANCH || 'main';

  const uniqueFiles = new Map();

  for (const file of files || []) {
    if (!file?.path) {
      continue;
    }

    uniqueFiles.set(
      file.path,
      {
        path: file.path,
        content: String(
          file.content ?? ''
        ),
        encoding:
          file.encoding === 'base64'
            ? 'base64'
            : 'utf-8'
      }
    );
  }

  if (uniqueFiles.size === 0) {
    return {
      changed: false,
      fileCount: 0,
      reason: 'no-files'
    };
  }

  /*
   * 1. 取得目前 branch HEAD。
   */
  const reference =
    await githubRequest(
      env,
      `/git/ref/heads/${encodeURIComponent(branch)}`
    );

  const parentCommitSha =
    reference.object.sha;

  /*
   * 2. 取得目前 commit 與 tree。
   */
  const parentCommit =
    await githubRequest(
      env,
      `/git/commits/${parentCommitSha}`
    );

  const baseTreeSha =
    parentCommit.tree.sha;

  /*
   * 3. 為所有待發布檔案建立 blob。
   *
   * 建立 blob 本身不會產生 Git commit。
   */
  const treeEntries = [];

  for (const file of uniqueFiles.values()) {
    const blob =
      await githubRequest(
        env,
        '/git/blobs',
        {
          method: 'POST',
          body: JSON.stringify({
            content: file.content,
            encoding: file.encoding
          })
        }
      );

    treeEntries.push({
      path: file.path,
      mode: '100644',
      type: 'blob',
      sha: blob.sha
    });
  }

  /*
   * 4. 以目前 tree 為基底建立新 tree。
   * 未列出的其他 Repository 檔案都會保留。
   */
  const newTree =
    await githubRequest(
      env,
      '/git/trees',
      {
        method: 'POST',
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: treeEntries
        })
      }
    );

  /*
   * 若 tree SHA 沒變，代表所有檔案內容都與 GitHub 相同。
   * 此時不建立 commit，避免空 Commit。
   */
  if (newTree.sha === baseTreeSha) {
    return {
      changed: false,
      fileCount: 0,
      reason: 'identical-content'
    };
  }

  /*
   * 5. 建立唯一的一個 commit。
   */
  const commit =
    await githubRequest(
      env,
      '/git/commits',
      {
        method: 'POST',
        body: JSON.stringify({
          message,
          tree: newTree.sha,
          parents: [
            parentCommitSha
          ]
        })
      }
    );

  /*
   * 6. 最後只更新一次 branch reference。
   */
  await githubRequest(
    env,
    `/git/refs/heads/${encodeURIComponent(branch)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        sha: commit.sha,
        force: false
      })
    }
  );

  return {
    changed: true,
    commitSha: commit.sha,
    fileCount: treeEntries.length
  };
}
