/*
 * @Author: 吴世扬 18368095041@163.com
 * @Date: 2026-08-11 11:28:15
 * @LastEditors: 吴世扬 18368095041@163.com
 * @LastEditTime: 2026-08-11 16:25:41
 * @FilePath: /honghu_game/src/main.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { createApp } from "vue";
import App from "./App.vue";
import "@/css/base.css";

import { validateNarrative } from "@/scenes/Scene01/content";


const setup = () => {
  validateNarrative();

  // 1. 初始化 Vue — 接管 #app 区域
  const app = createApp(App);
  app.mount("#app");
};

setup();
