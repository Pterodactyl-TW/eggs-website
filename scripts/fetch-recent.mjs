// 在部署（GitHub Actions）時執行：用有 token 的 api.github.com 呼叫（5000 次/小時額度）
// 預先產生「最近更新」清單，寫成 public/recent-eggs.json 讓網站直接讀取靜態檔案，
// 完全不必在每個訪客瀏覽時即時呼叫 api.github.com（那個未登入只有 60 次/小時，很容易被打爆）。
import { writeFileSync } from "node:fs";

const ORG = "Pterodactyl-TW";
const REPOS = {
  games: { key: "game-eggs", label: "遊戲" },
  applications: { key: "application-eggs", label: "應用程式" },
  languages: { key: "generic-eggs", label: "語言" },
};
const COMMITS_TO_SCAN = 15;
const TAKE = 12;
const TOKEN = process.env.GITHUB_TOKEN;

async function fetchJson(url) {
  const headers = { Accept: "application/vnd.github+json" };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}：${url}`);
  return res.json();
}

function categoryOf(path) {
  const segments = path.split("/");
  return segments.length > 1 ? segments[0] : "其他";
}

function humanName(path) {
  const file = path.split("/").pop().replace(/^egg-/, "").replace(/\.json$/i, "");
  return file.replace(/[-_]/g, " ");
}

async function main() {
  const updates = [];

  for (const [repoId, repo] of Object.entries(REPOS)) {
    try {
      const commits = await fetchJson(
        `https://api.github.com/repos/${ORG}/${repo.key}/commits?per_page=${COMMITS_TO_SCAN}`
      );
      for (const commit of commits) {
        try {
          const detail = await fetchJson(
            `https://api.github.com/repos/${ORG}/${repo.key}/commits/${commit.sha}`
          );
          for (const file of detail.files || []) {
            if (!/^egg-.*\.json$/i.test(file.filename.split("/").pop())) continue;
            if (updates.find((u) => u.egg.repo === repo.key && u.egg.path === file.filename)) continue;
            const date = commit.commit?.author?.date || commit.commit?.committer?.date;
            updates.push({
              date,
              egg: {
                repoId,
                repo: repo.key,
                repoLabel: repo.label,
                path: file.filename,
                category: categoryOf(file.filename),
                name: humanName(file.filename),
              },
            });
          }
        } catch (err) {
          console.warn(`跳過 ${repo.key} 的一個 commit：${err.message}`);
        }
      }
    } catch (err) {
      console.warn(`無法取得 ${repo.key} 的 commit 清單：${err.message}`);
    }
  }

  updates.sort((a, b) => new Date(b.date) - new Date(a.date));
  const result = updates.slice(0, TAKE);
  writeFileSync("public/recent-eggs.json", JSON.stringify(result, null, 2));
  console.log(`已寫入 public/recent-eggs.json，共 ${result.length} 筆。`);
}

main();
