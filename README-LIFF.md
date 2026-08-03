# 雙 LIFF 版本設定

本專案拆成兩個 LIFF App：

## 1. 遊戲 LIFF
- Endpoint URL：`https://你的網域/`
- Scopes：可只選 `openid`、`profile`，也可依 LINE Console 允許的最低設定
- **不要選 `chat_message.write`**
- 將 LIFF ID 填到 `liff-config.js` 的 `gameLiffId`

## 2. 分享 LIFF
- Endpoint URL：`https://你的網域/share.html`
- Scopes：`openid`、`profile`、`chat_message.write`
- 啟用 Share target picker
- 將 LIFF ID 填到 `liff-config.js` 的 `shareLiffId`

## 使用流程
1. 玩家透過遊戲 LIFF URL 進入。
2. 不需先填姓名與日期，直接選路線並回答。
3. 結果頁按「傳送給主持人」。
4. 跳到分享 LIFF，首次使用時 LINE 才詢問聊天室傳送權限。
5. 玩家填姓名、日期、選主持人。
6. 按確認，LINE 開啟好友／群組選擇器。

注意：LIFF 無法依主持人名稱自動鎖定某個私人好友。玩家仍須在 LINE 選擇器中選到同一位主持人。
