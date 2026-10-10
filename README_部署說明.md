# 海星網站 + Assign Roles v3.3 整合覆蓋包

此 ZIP 是**增量覆蓋包**，不是 372 MB 全站壓縮檔。請先保留 `starfishlarp-main(1).zip` 的原始所有檔案，再把此 ZIP 解壓到**同一個網站根目錄**，新增 `assign-roles/`、`functions/` 和 `_routes.json`。不需要刪除原網站圖片、音樂、影片或其他 HTML。

## 入口
- 原海星首頁：`/`，維持原樣
- 角色測驗：`/assign-roles/`
- 角色測驗後台：`/assign-roles/admin.html`
- 指定劇本：`/assign-roles/?script=plastic-greenhouse`

## Cloudflare
此套件的 `/functions/api/*` 是 **Cloudflare Pages Functions**，GitHub Pages 無法執行後台 API。若目前原站只有 GitHub Pages，必須額外用 Cloudflare Pages 部署這份 repo，或另外部署 API。

在 Cloudflare Pages 設定：
- `ADMIN_PASSWORD`（Secret）
- `SESSION_SECRET`（Secret）
- `GITHUB_TOKEN`（Secret，對此 repo 的 Contents 有寫入權限）
- `GITHUB_OWNER`（GitHub 帳號）
- `GITHUB_REPO`（存放整合後網站的 repo 名稱）
- `GITHUB_BRANCH`（通常 main）
- KV 綁定 `ADMIN_UPLOADS`（沿用原本同名 KV namespace）

注意：如果你原本 Cloudflare Pages 已有 `/functions`，請逐檔合併，不要整個覆蓋掉既有 Function。
後台 API 會寫入 GitHub 的 `assign-roles/data/`，不會覆蓋海星既有 `scripts.js`、`scripts-data.js` 等內容。

## 現有資料
附帶 CMS 範例劇本 `plastic-greenhouse`。若原 Assign Roles 已有實際劇本資料，請用你原本的 `data/index.json`、`data/settings.json` 和 `data/scripts/*` 覆蓋 `assign-roles/data/` 的範例資料。舊資料的 `textStyles` 可沿用。

## Google Sheets
`/functions/api/submit-result.js` 已附上。各劇本 `settings.json` 仍須設定 Google Apps Script Web App URL，並部署支援此提交格式的 Apps Script。此套件未更動 Google Sheet 本身。

## 不會自動完成的事情
- 不會自動更改 Cloudflare 的 Pages 專案綁定或 Secrets
- 不會自動推送 GitHub
- 不會把海星原本每一份 HTML 問卷轉成 Assign Roles 的題庫
- 不會修改海星原本首頁、PWA 與 `scripts.js`，避免破壞既有功能

## 驗證
- 靜態頁面路徑與 JS 語法已檢查
- 需實際部署後驗證 Cloudflare Secrets、KV、GitHub token、Google Sheets 權限
