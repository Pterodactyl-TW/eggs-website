# Pterodactyl-TW Eggs

[![部署](https://github.com/Pterodactyl-TW/eggs-website/actions/workflows/deploy.yml/badge.svg)](https://github.com/Pterodactyl-TW/eggs-website/actions/workflows/deploy.yml)

[eggs.pterodactyl.tw](https://eggs.pterodactyl.tw) 的原始碼 —— Pterodactyl-TW 繁體中文化 Eggs 資源庫，讓你搜尋、瀏覽並取得可直接匯入 Panel 的 Egg 設定檔。

## 這是什麼

本站彙整了 Pterodactyl-TW 底下三個繁體中文化 Egg 倉庫的內容：

- [game-eggs](https://github.com/Pterodactyl-TW/game-eggs) — 遊戲伺服器 Egg
- [application-eggs](https://github.com/Pterodactyl-TW/application-eggs) — 應用程式 Egg
- [generic-eggs](https://github.com/Pterodactyl-TW/generic-eggs) — 通用語言 Egg

檔案樹與 Egg 內容皆在瀏覽器端即時抓取（透過 [jsDelivr](https://www.jsdelivr.com/) CDN，不受 GitHub API 額度限制），點進任一個 Egg 都能看到說明、變數設定、Docker 映像檔、安裝腳本，並一鍵取得可直接貼進 Panel「透過 URL 匯入」的網址。

## 技術架構

- [Astro](https://astro.build/)：靜態網站產生器，輸出純靜態頁面部署到 GitHub Pages
- 資料抓取（檔案樹、Egg 內容）在瀏覽器端即時透過 jsDelivr CDN / GitHub raw 完成，不需要後端伺服器
- [marked](https://github.com/markedjs/marked)：解析 Egg 資料夾下的 `README.md`
- [highlight.js](https://highlightjs.org/)：安裝腳本／啟動指令的語法上色

## 本機開發

```bash
npm install
npm run dev
```

開發環境下「最近更新」與列表頁的 Egg 名稱／描述預設不會顯示（避免每次啟動都打 GitHub API），如果想在本機看到真實資料，執行：

```bash
npm run fetch:meta
GITHUB_TOKEN=<你的 GitHub token> npm run fetch:recent
```

這會分別產生 `public/egg-meta.json`（每個 Egg 的 name/description）與 `public/recent-eggs.json`（首頁「最近更新」清單），兩者都已加入 `.gitignore`，只在本機或部署時產生。

## 部署

推送到 `main` 分支會觸發 `.github/workflows/deploy.yml`：依序執行 `fetch:recent`、`fetch:meta` 產生上述兩份資料，再用 `astro build` 建置，最後部署到 `gh-pages` 分支（自訂網域 `eggs.pterodactyl.tw`）。

## 貢獻

- 想請求新增或更新一個 Egg？請參考站上的[請求 Egg](https://eggs.pterodactyl.tw/request/) 頁面。
- 想改善這個網站本身？歡迎直接開 Pull Request。

## 繁體中文化服務團隊

<table>
  <tr>
    <td align="center"><a href="https://github.com/AvianJay"><img src="https://github.com/AvianJay.png" width="80px;" alt="AvianJay"/><br /><sub><b>AvianJay</b></sub></a></td>
    <td align="center"><a href="https://github.com/creeperdevme"><img src="https://github.com/creeperdevme.png" width="80px;" alt="creeperdevme"/><br /><sub><b>creeperdevme</b></sub></a></td>
    <td align="center"><a href="https://github.com/Kevin28576"><img src="https://github.com/Kevin28576.png" width="80px;" alt="Kevin28576"/><br /><sub><b>Kevin28576</b></sub></a></td>
    <td align="center"><a href="https://github.com/kusanagi-akane"><img src="https://github.com/kusanagi-akane.png" width="80px;" alt="kusanagi-akane"/><br /><sub><b>kusanagi-akane</b></sub></a></td>
    <td align="center"><a href="https://github.com/littlecommandcat"><img src="https://github.com/littlecommandcat.png" width="80px;" alt="littlecommandcat"/><br /><sub><b>littlecommandcat</b></sub></a></td>
    <td align="center"><a href="https://github.com/rise0313"><img src="https://github.com/rise0313.png" width="80px;" alt="rise0313"/><br /><sub><b>rise0313</b></sub></a></td>
  </tr>
</table>

如果你也想加入我們的繁體中文化服務團隊，歡迎透過 [Discord](https://pterodactyl.tw/discord) 與我們聯絡。

## 授權條款

本專案採用 [MIT 授權條款](LICENSE) 發布。
