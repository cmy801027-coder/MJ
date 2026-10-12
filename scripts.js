/* ==========================================================
   劇本資料 · 單一資料來源（Single Source of Truth）
   新增 / 修改劇本只需改這裡一處。
   index.html 與 榮譽牆.html 皆讀取 window.SCRIPTS。
   欄位：id 名稱 file 路徑 / players 人數(數字,篩選用)
        playersLabel 人數顯示 / time 時長(數字,排序用) timeLabel 顯示
        difficulty 難度 0-5 / types 標籤 / theme 主題色
        poster 海報URL / reviewKey 榮譽牆評價對應鍵(CSV「劇本」欄)
        characters 角色名單（新增玩本記錄表單的角色下拉選項）
        youtube 劇本介紹影片（選填）：影片 ID 或網址，有填劇本頁才會出現「▶ 介紹影片」
   ========================================================== */
window.SCRIPTS = [
  {
    "id": "drunk",
    "store": "敏捷私團",
    "name": "醉凌雲",
    "players": 6,
    "playersLabel": "2男4女/3男3女",
    "time": 9,
    "timeLabel": "9小時",
    "difficulty": 0,
    "types": [
      "情感",
      "古風"
    ],
    "allowCrossGender": false,
    "characters": [
      "方逆",
      "蘇淺雨",
      "蘇溫言",
      "冷寂",
      "慕歸",
      "白未染"
    ],
    "poster": "img/劇本/drunk/poster.jpg",
    "theme": "default",
    "reviewKey": "醉凌雲",
    "youtube": "",
    "file": "script.html?id=drunk"
  },
  {
    "id": "polarnight",
    "name": "極夜",
    "players": 6,
    "playersLabel": "不限",
    "time": 7,
    "timeLabel": "7小時",
    "priceLabel": "900",
    "store": "其他店家",
    "difficulty": 0,
    "types": [
      "情感",
      "機制"
    ],
    "allowCrossGender": true,
    "characters": [],
    "poster": "img/劇本/polarnight/poster.jpg",
    "theme": "default",
    "reviewKey": "極夜",
    "youtube": "",
    "file": "script.html?id=polarnight"
  }
];

// scripts.js 會在首頁 DOM 完成後載入；立刻同步初始數量。
(function syncInitialScriptCount() {
  const countElement = document.getElementById('filteredCount');
  if (countElement) countElement.textContent = String(window.SCRIPTS.length);
})();
