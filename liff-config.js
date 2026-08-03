'use strict';

window.LIFF_CONFIG = {
  /*
   * 唯一的 LIFF ID。
   *
   * LINE Developers 設定：
   * 1. Endpoint URL 指向目前網站的 index.html
   * 2. 不需要勾選 chat_message.write
   * 3. 開啟 Share Target Picker
   */
  liffId: '2010940918-AhmNBhgx',

  /*
   * 主持人清單只用來：
   * 1. 讓玩家標示想傳給哪位主持人
   * 2. 寫入分享訊息
   *
   * LINE 的分享視窗仍會由玩家親自選擇聊天室。
   */
  hosts: [
    {
      id: 'host-1',
      name: '小明',
      displayName: '小明主持人',
      note: '情感沉浸線'
    },
    {
      id: 'host-2',
      name: '阿哲',
      displayName: '阿哲主持人',
      note: '推理還原線'
    },
    {
      id: 'host-3',
      name: '小雨',
      displayName: '小雨主持人',
      note: '新手引導線'
    }
  ]
};