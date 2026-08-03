# Assign Roles v2

此版本以原 GitHub Repository `cmy801027-coder/MJ` 的內容為模板完成：

- 單一 LIFF
- 使用 `liff.shareTargetPicker()`
- 進入遊戲時不要求 `chat_message.write`
- 所有可替換內容移入 `/data`
- 保留原角色圖片、文字、題目與視覺風格

## 資料檔

- `data/story.json`
- `data/questions.json`
- `data/characters.json`
- `data/hosts.json`
- `data/setting.json`

## 部署

將 ZIP 解壓縮後，把全部內容覆蓋到 GitHub Repository 根目錄。

GitHub Pages 必須透過 HTTP/HTTPS 開啟。請勿直接雙擊 `index.html`，因為瀏覽器會封鎖 JSON fetch。

## LINE Developers

- Endpoint URL：網站根網址
- LIFF ID：修改 `data/setting.json` 的 `liffId`
- Scope：`openid`、`profile`
- 不需要 `chat_message.write`
- 啟用 Share Target Picker
