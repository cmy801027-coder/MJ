# 塑料溫室：敘事測驗＋Google Sheets 管理後台

## 專案頁面

- 玩家測驗：`index.html`
- 管理後台：`admin.html`
- Google Apps Script：`google-apps-script/Code.gs`
- 雲端連線設定：`sheets-config.js`

## 一、建立 Google 試算表

1. 到 Google Sheets 新增一份空白試算表。
2. 名稱可以取為「塑料溫室玩家資料」。
3. 不必自己建立欄位，第一次收到資料時程式會自動建立 `玩家紀錄` 工作表和標題列。

## 二、建立 Apps Script

1. 在該試算表上方選單按「擴充功能」→「Apps Script」。
2. 刪除編輯器中的預設內容。
3. 開啟本專案的 `google-apps-script/Code.gs`，複製全部內容貼入。
4. 按儲存。

## 三、設定管理金鑰

1. 在 Apps Script 左側點「專案設定」。
2. 找到「指令碼屬性」，按「新增指令碼屬性」。
3. 屬性名稱填：`ADMIN_KEY`
4. 值填一串只有你知道的文字，例如：`PG-2026-your-secret-key`
5. 儲存。

這個值之後也要填入網站的 `sheets-config.js`。

## 四、部署成網頁應用程式

1. Apps Script 右上角按「部署」→「新增部署作業」。
2. 類型選「網頁應用程式」。
3. 執行身分選「我」。
4. 存取權限選「任何人」。若介面顯示「任何人，包含匿名使用者」，選該項。
5. 按部署，第一次會要求授權。
6. 複製結尾為 `/exec` 的網頁應用程式網址。

請勿使用結尾為 `/dev` 的測試網址。

## 五、填入網站設定

開啟 `sheets-config.js`：

```js
window.SHEETS_CONFIG = {
  endpoint: 'https://script.google.com/macros/s/你的部署ID/exec',
  adminKey: 'PG-2026-your-secret-key'
};
```

`adminKey` 必須與 Apps Script 指令碼屬性的 `ADMIN_KEY` 完全相同。

## 六、本機測試

不要只雙擊 HTML，建議在專案資料夾執行：

```bash
python -m http.server 8000
```

再開啟：

- 玩家頁：`http://localhost:8000/index.html`
- 管理後台：`http://localhost:8000/admin.html`

完成一次測驗，在結果頁按「送出結果」。接著打開管理後台，按「同步 Google Sheets」。

## 七、部署到 GitHub Pages

將整個資料夾內容上傳到 GitHub Repository，並在：

`Settings → Pages → Deploy from a branch → main / root`

啟用 GitHub Pages。

## 資料欄位

Google Sheets 會保存：

- 紀錄 ID
- 完成時間
- 玩家姓名
- 玩家填寫的遊玩時間
- 男角／女角路線
- 最終角色
- 留言
- 角色分數
- 完整排行
- 每題答案
- 完整 JSON 原始資料

## 後台功能

- 同步 Google Sheets
- 玩家數、今日人數、不同玩家、留言數
- 角色結果分布
- 路線分布
- 各題選項統計
- 搜尋玩家、角色與留言
- 刪除單筆雲端紀錄
- 清除全部雲端紀錄
- 匯出 CSV
- 備份 JSON

## 注意事項

- `adminKey` 放在前端檔案中，只能作為簡易活動管理門檻，不是真正安全的登入系統。公開部署後，懂前端技術的人仍可能查看它。
- 若資料涉及敏感個資，應改用 Google 登入、Firebase Authentication 或由 Apps Script 本身提供受控後台。
- Apps Script 每次修改 `Code.gs` 後，需要到「管理部署作業」建立新版本，網站才會使用新程式。
- 玩家送出時仍會在瀏覽器保留本機備份，即使網路暫時異常，資料不會立刻蒸發成數位霧氣。
