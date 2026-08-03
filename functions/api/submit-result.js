function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        'Content-Type':
          'application/json; charset=utf-8',
        'Cache-Control':
          'no-store'
      }
    }
  );
}

function isAllowedAppsScriptUrl(value) {
  try {
    const url = new URL(value);

    return (
      url.protocol === 'https:' &&
      url.hostname ===
        'script.google.com' &&
      /^\/macros\/s\/[^/]+\/exec$/.test(
        url.pathname
      )
    );
  } catch {
    return false;
  }
}

export async function onRequestPost({
  request
}) {
  try {
    const body =
      await request.json();

    const endpoint =
      String(
        body?.endpoint || ''
      ).trim();

    const payload =
      body?.payload;

    if (
      !isAllowedAppsScriptUrl(
        endpoint
      )
    ) {
      return json({
        ok: false,
        error:
          'Google Apps Script URL 無效，必須是以 /exec 結尾的正式部署網址'
      }, 400);
    }

    if (
      !payload ||
      typeof payload !== 'object'
    ) {
      return json({
        ok: false,
        error:
          '缺少測驗結果資料'
      }, 400);
    }

    /*
     * Cloudflare 在伺服器端呼叫 Apps Script，
     * 不受瀏覽器 CORS 限制，且可以讀取真正回應。
     */
    const googleResponse =
      await fetch(
        endpoint,
        {
          method: 'POST',
          redirect: 'follow',
          headers: {
            'Content-Type':
              'text/plain;charset=utf-8'
          },
          body:
            JSON.stringify(payload)
        }
      );

    const responseText =
      await googleResponse.text();

    if (!googleResponse.ok) {
      return json({
        ok: false,
        error:
          `Google Apps Script 回傳 HTTP ${googleResponse.status}`,
        details:
          responseText.slice(0, 500)
      }, 502);
    }

    let googleResult;

    try {
      googleResult =
        JSON.parse(responseText);
    } catch {
      /*
       * 若看到 HTML，通常表示：
       * - Web App 未設為所有人可存取
       * - 貼到 /dev 而非 /exec
       * - 部署授權未完成
       */
      const looksLikeHtml =
        /^\s*</.test(
          responseText
        );

      return json({
        ok: false,
        error:
          looksLikeHtml
            ? 'Google Apps Script 回傳網頁而不是 JSON。請確認部署權限為「所有人」，並使用 /exec 網址。'
            : 'Google Apps Script 回傳格式不是 JSON。',
        details:
          responseText.slice(0, 500)
      }, 502);
    }

    if (
      googleResult?.ok !== true
    ) {
      return json({
        ok: false,
        error:
          googleResult?.error ||
          'Google Apps Script 表示寫入失敗',
        googleResult
      }, 502);
    }

    return json({
      ok: true,
      row:
        googleResult.row || null,
      duplicate:
        googleResult.duplicate === true
    });
  } catch (error) {
    console.error(
      'submit-result error',
      error
    );

    return json({
      ok: false,
      error:
        error?.message ||
        '伺服器送出失敗'
    }, 500);
  }
}

export async function onRequest() {
  return json({
    ok: false,
    error:
      'Method Not Allowed'
  }, 405);
}
