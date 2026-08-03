const API = 'https://api.github.com';

function headers(env) {
  return {
    Authorization:
      `Bearer ${env.GITHUB_TOKEN}`,
    Accept:
      'application/vnd.github+json',
    'X-GitHub-Api-Version':
      '2022-11-28',
    'User-Agent':
      'assign-roles-cms'
  };
}

async function requestGithub(
  env,
  path,
  options = {}
) {
  const response = await fetch(
    `${API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}${path}`,
    {
      ...options,
      headers: {
        ...headers(env),
        ...(options.body
          ? {
              'Content-Type':
                'application/json'
            }
          : {}),
        ...(options.headers || {})
      }
    }
  );

  if (!response.ok) {
    throw new Error(
      `GitHub API ${options.method || 'GET'} ${path}: ` +
      `${response.status} ${await response.text()}`
    );
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function decodeBase64Utf8(value) {
  const binary =
    atob(
      String(value)
        .replace(/\n/g, '')
    );

  const bytes =
    Uint8Array.from(
      binary,
      character =>
        character.charCodeAt(0)
    );

  return new TextDecoder()
    .decode(bytes);
}

export async function getFile(
  env,
  path
) {
  const branch =
    env.GITHUB_BRANCH || 'main';

  const encodedPath =
    path
      .split('/')
      .map(encodeURIComponent)
      .join('/');

  const response = await fetch(
    `${API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}` +
    `/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`,
    {
      headers: headers(env)
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
  const file =
    await getFile(
      env,
      path
    );

  if (!file) {
    throw new Error(
      `找不到 ${path}`
    );
  }

  return JSON.parse(
    decodeBase64Utf8(
      file.content
    )
  );
}

export async function commitFiles(
  env,
  files,
  message
) {
  const branch =
    env.GITHUB_BRANCH || 'main';

  const uniqueFiles =
    new Map();

  for (const file of files || []) {
    if (!file?.path) {
      continue;
    }

    uniqueFiles.set(
      file.path,
      {
        path: file.path,
        content:
          String(file.content ?? ''),
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
      fileCount: 0
    };
  }

  const reference =
    await requestGithub(
      env,
      `/git/ref/heads/${encodeURIComponent(branch)}`
    );

  const parentCommitSha =
    reference.object.sha;

  const parentCommit =
    await requestGithub(
      env,
      `/git/commits/${parentCommitSha}`
    );

  const baseTreeSha =
    parentCommit.tree.sha;

  const treeEntries = [];

  for (
    const file
    of uniqueFiles.values()
  ) {
    const blob =
      await requestGithub(
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

  const tree =
    await requestGithub(
      env,
      '/git/trees',
      {
        method: 'POST',
        body: JSON.stringify({
          base_tree:
            baseTreeSha,
          tree:
            treeEntries
        })
      }
    );

  if (tree.sha === baseTreeSha) {
    return {
      changed: false,
      fileCount: 0
    };
  }

  const commit =
    await requestGithub(
      env,
      '/git/commits',
      {
        method: 'POST',
        body: JSON.stringify({
          message,
          tree: tree.sha,
          parents: [
            parentCommitSha
          ]
        })
      }
    );

  await requestGithub(
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
    commitSha:
      commit.sha,
    fileCount:
      treeEntries.length
  };
}
