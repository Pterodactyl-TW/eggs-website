// 在部署（或本機需要時）執行：把三個倉庫裡所有 egg-*.json 的真正 name/description
// 抓下來，寫成 public/egg-meta.json，讓列表頁的卡片可以顯示正確的名稱與描述，
// 而不是用檔名猜測、用路徑當描述。
//
// 全部走 jsDelivr CDN（cdn.jsdelivr.net / data.jsdelivr.com），不會受 api.github.com
// 每小時 60 次配額限制，所以不需要 GITHUB_TOKEN，本機也能直接執行：
//   npm run fetch:meta
import { writeFileSync } from "node:fs";

const ORG = "Pterodactyl-TW";
const REPOS = ["game-eggs", "application-eggs", "generic-eggs"];
const CONCURRENCY = 12;

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}：${url}`);
  return res.json();
}

async function fetchRepoTree(repo) {
  for (const branch of ["main", "master"]) {
    try {
      const data = await fetchJson(
        `https://data.jsdelivr.com/v1/packages/gh/${ORG}/${repo}@${branch}?structure=flat`
      );
      const paths = (data.files || [])
        .map((f) => f.name.replace(/^\//, ""))
        .filter((p) => /^egg-.*\.json$/i.test(p.split("/").pop()));
      if (paths.length) return { branch, paths };
    } catch (_) {
      // 試下一個分支名稱
    }
  }
  throw new Error(`無法取得 ${repo} 的檔案樹`);
}

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function main() {
  const meta = {};

  for (const repo of REPOS) {
    meta[repo] = {};
    let branch, paths;
    try {
      ({ branch, paths } = await fetchRepoTree(repo));
    } catch (err) {
      console.warn(`跳過 ${repo}：${err.message}`);
      continue;
    }

    console.log(`${repo}：共 ${paths.length} 個 Egg，開始抓取內容...`);
    let done = 0;
    await mapWithConcurrency(paths, CONCURRENCY, async (path) => {
      try {
        // path 逐段編碼（例如 "c#" 裡的 # 若不編碼會被當成網址 fragment，導致抓取失敗）
        const encodedPath = path.split("/").map(encodeURIComponent).join("/");
        const res = await fetch(`https://cdn.jsdelivr.net/gh/${ORG}/${repo}@${branch}/${encodedPath}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        meta[repo][path] = {
          name: json.name || null,
          description: json.description || null,
        };
      } catch (err) {
        console.warn(`  跳過 ${repo}/${path}：${err.message}`);
      } finally {
        done += 1;
        if (done % 50 === 0) console.log(`  ${repo}：${done}/${paths.length}`);
      }
    });
  }

  writeFileSync("public/egg-meta.json", JSON.stringify(meta));
  const total = Object.values(meta).reduce((sum, m) => sum + Object.keys(m).length, 0);
  console.log(`已寫入 public/egg-meta.json，共 ${total} 筆 Egg 資料。`);
}

main();
