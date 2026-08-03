# Assign Roles v2 CMS

## 功能

- `admin.html` 管理後台
- 管理多個劇本
- 編輯開場動畫與停留時間
- 編輯題目、答案、三個角色分數
- 編輯男女角色、角色圖片、介紹、角色音樂
- 新增與刪除主持人
- 拖曳上傳 BGM、圖片、MP3
- 按「儲存並發布」後透過 Cloudflare Pages Functions Commit 到 GitHub
- GitHub Commit 後由 Cloudflare Pages 自動部署
- 玩家端維持單一 LIFF 與 Share Target Picker

## 重要：Cloudflare Pages 設定

### 1. Environment variables / Secrets

在 Cloudflare Pages 專案的 Settings → Variables and Secrets 設定：

- `ADMIN_PASSWORD`：後台登入密碼
- `SESSION_SECRET`：至少 32 字元的亂數
- `GITHUB_TOKEN`：GitHub Fine-grained Personal Access Token
- `GITHUB_OWNER`：`cmy801027-coder`
- `GITHUB_REPO`：`MJ`
- `GITHUB_BRANCH`：`main`

GitHub Token 只需授予此 Repository：

- Contents: Read and write
- Metadata: Read

### 2. 建立 Cloudflare KV

建立一個 KV Namespace，名稱例如 `assign-roles-uploads`。

在 Pages 專案 Settings → Bindings 新增 KV binding：

- Variable name：`ADMIN_UPLOADS`
- KV namespace：剛建立的 Namespace

KV 只用於「上傳後、發布前」的暫存。發布成功後會自動刪除。

### 3. 重新部署

Cloudflare Pages 必須使用 Git Integration 或 Wrangler 部署，才能執行 `/functions`。

### 4. 開啟後台

`https://你的網域/admin.html`

## 檔案架構

- `data/index.json`：劇本入口
- `data/settings.json`：全站與 LIFF 設定
- `data/hosts.json`：主持人
- `data/scripts/<script-id>/settings.json`
- `data/scripts/<script-id>/story.json`
- `data/scripts/<script-id>/questions.json`
- `data/scripts/<script-id>/characters.json`

## 安全

後台密碼與 GitHub Token 不會出現在前端 JavaScript。所有 GitHub 操作都由 Cloudflare Pages Functions 執行。
