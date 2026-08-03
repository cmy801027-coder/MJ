# 塑料溫室 LIFF 分享版

這一版不會把結果送進 Google Sheets。玩家完成測驗後：

1. 按「交給主持人」
2. 在網站內選擇主持人
3. LIFF 開啟 LINE 的分享對象選擇器
4. 玩家在 LINE 裡點選相同主持人並送出

## 1. 建立 LINE Login Channel

進入 LINE Developers Console，建立 Provider，再建立 **LINE Login channel**。

## 2. 建立 LIFF App

在 LINE Login channel 裡新增 LIFF App：

- Endpoint URL：填 GitHub Pages 網址，例如 `https://帳號.github.io/專案/`
- Size：Full
- Scope：勾選 `openid`、`profile`、`chat_message.write`
- Share target picker：啟用

建立後複製 LIFF ID。

## 3. 設定 LIFF ID 和主持人

編輯 `liff-config.js`：

```js
window.LIFF_CONFIG = {
  liffId: '你的 LIFF ID',
  hosts: [
    { id: 'host-1', name: '小明', displayName: '小明主持人', note: '情感沉浸線' }
  ]
};
```

`displayName` 建議填玩家在 LINE 好友清單看到的主持人名稱。

## 4. 部署

LIFF Endpoint 必須使用 HTTPS。最簡單方式是 GitHub Pages：

1. 將資料夾內檔案上傳到 GitHub repository 根目錄
2. Settings → Pages
3. Deploy from branch → main → /(root)
4. 把產生的 HTTPS 網址填回 LIFF Endpoint URL

## 5. 用 LIFF URL 測試

LINE Developers Console 會提供 LIFF URL，格式通常為：

`https://liff.line.me/你的LIFF-ID`

請用手機 LINE 開啟這個網址。普通 `file://` 雙擊或純 HTTP 本機網址無法完整測試 LIFF 分享功能。

## 重要限制

LIFF 的 `shareTargetPicker()` 不允許網站在背景直接鎖定某位私人好友。網站內的主持人選擇會把主持人名字寫進訊息並提醒玩家，接著仍需由玩家在 LINE 選擇器中點選該主持人。這是 LINE 的隱私與授權設計。
