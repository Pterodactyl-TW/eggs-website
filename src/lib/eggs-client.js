// 共用的即時資料抓取邏輯：從 Pterodactyl-TW 的三個 egg 倉庫抓取即時資料，
// 供 Home / Games / Applications / Languages 頁面共用。

export const ORG = "Pterodactyl-TW";

export const REPOS = {
  games: { key: "game-eggs", label: "遊戲", icon: "🎮" },
  applications: { key: "application-eggs", label: "應用程式", icon: "📦" },
  languages: { key: "generic-eggs", label: "語言", icon: "💻" },
};

const CACHE_TTL_MS = 15 * 60 * 1000;
const COMMITS_TO_SCAN = 8;

function cacheGet(key, ttl) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.fetchedAt > ttl) return null;
    return parsed.data;
  } catch (_) {
    return null;
  }
}

function cacheSet(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ fetchedAt: Date.now(), data }));
  } catch (_) {
    /* localStorage 已滿或被停用時忽略 */
  }
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}：${url}`);
  return res.json();
}

async function fetchRepoTree(repoKey) {
  const cacheKey = `eggs-tw:${repoKey}:tree`;
  const cached = cacheGet(cacheKey, CACHE_TTL_MS);
  if (cached) return cached;

  for (const branch of ["main", "master"]) {
    try {
      const data = await fetchJson(
        `https://api.github.com/repos/${ORG}/${repoKey}/git/trees/${branch}?recursive=1`
      );
      const tree = (data.tree || []).filter(
        (item) => item.type === "blob" && /^egg-.*\.json$/i.test(item.path.split("/").pop())
      );
      const result = { branch, tree };
      cacheSet(cacheKey, result);
      return result;
    } catch (_) {
      // 試下一個分支名稱
    }
  }
  throw new Error(`無法取得 ${repoKey} 的檔案樹`);
}

function categoryOf(path) {
  const segments = path.split("/");
  return segments.length > 1 ? segments[0] : "其他";
}

function humanName(path) {
  const file = path.split("/").pop().replace(/^egg-/, "").replace(/\.json$/i, "");
  return file.replace(/[-_]/g, " ");
}

export async function loadRepoEggs(repoId) {
  const repo = REPOS[repoId];
  const { branch, tree } = await fetchRepoTree(repo.key);
  return tree.map((item) => ({
    repoId,
    repo: repo.key,
    repoLabel: repo.label,
    branch,
    path: item.path,
    category: categoryOf(item.path),
    name: humanName(item.path),
  }));
}

export async function loadAllEggs() {
  const results = await Promise.allSettled(
    Object.keys(REPOS).map((repoId) => loadRepoEggs(repoId))
  );
  const eggs = [];
  const errors = [];
  results.forEach((result, i) => {
    const repoId = Object.keys(REPOS)[i];
    if (result.status === "fulfilled") {
      eggs.push(...result.value);
    } else {
      errors.push(`${REPOS[repoId].label}：${result.reason.message || result.reason}`);
    }
  });
  return { eggs, errors };
}

export function rawUrl(egg) {
  return `https://raw.githubusercontent.com/${ORG}/${egg.repo}/${egg.branch}/${egg.path}`;
}

export function githubUrl(egg) {
  return `https://github.com/${ORG}/${egg.repo}/blob/${egg.branch}/${egg.path}`;
}

// 產生指向詳細頁面的連結（詳細頁再依 repoId + path 即時重新查找該 egg）。
export function eggDetailUrl(egg) {
  const params = new URLSearchParams({ repo: egg.repoId, path: egg.path });
  return `/egg/?${params.toString()}`;
}

// 詳細頁面用：依 repoId 找出對應的 egg（重用 loadRepoEggs 的快取）。
export async function findEgg(repoId, path) {
  const eggs = await loadRepoEggs(repoId);
  return eggs.find((e) => e.path === path) || null;
}

// 抓取某個檔案的 commit 作者清單，作為「貢獻者」列表（依 GitHub commit 歷史，非 egg 檔內建欄位）。
export async function loadContributors(egg) {
  const cacheKey = `eggs-tw:contributors:${egg.repo}:${egg.path}`;
  const cached = cacheGet(cacheKey, CACHE_TTL_MS);
  if (cached) return cached;

  try {
    const commits = await fetchJson(
      `https://api.github.com/repos/${ORG}/${egg.repo}/commits?path=${encodeURIComponent(egg.path)}&per_page=100`
    );
    const seen = new Set();
    const contributors = [];
    for (const commit of commits) {
      const login = commit.author?.login;
      const name = commit.commit?.author?.name || commit.commit?.author?.email;
      const key = login || name;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      contributors.push({ login, name });
    }
    cacheSet(cacheKey, contributors);
    return contributors;
  } catch (_) {
    return [];
  }
}

// 抓取每個倉庫最近的幾筆 commit，整理出「最近更新」的 Egg 清單（含更新時間）。
export async function loadRecentlyUpdated(limitPerRepo = COMMITS_TO_SCAN, take = 8) {
  const cacheKey = "eggs-tw:recent";
  const cached = cacheGet(cacheKey, CACHE_TTL_MS);
  if (cached) return cached;

  const { eggs } = await loadAllEggs();
  const eggByPath = {};
  eggs.forEach((egg) => {
    eggByPath[`${egg.repo}:${egg.path}`] = egg;
  });

  const updates = [];
  await Promise.allSettled(
    Object.values(REPOS).map(async (repo) => {
      try {
        const commits = await fetchJson(
          `https://api.github.com/repos/${ORG}/${repo.key}/commits?per_page=${limitPerRepo}`
        );
        for (const commit of commits) {
          try {
            const detail = await fetchJson(
              `https://api.github.com/repos/${ORG}/${repo.key}/commits/${commit.sha}`
            );
            for (const file of detail.files || []) {
              if (!/^egg-.*\.json$/i.test(file.filename.split("/").pop())) continue;
              const egg = eggByPath[`${repo.key}:${file.filename}`];
              if (!egg) continue;
              const date = commit.commit?.author?.date || commit.commit?.committer?.date;
              if (!updates.find((u) => u.egg.path === egg.path && u.egg.repo === egg.repo)) {
                updates.push({ egg, date });
              }
            }
          } catch (_) {
            // 忽略單一 commit 抓取失敗
          }
        }
      } catch (_) {
        // 忽略單一倉庫抓取失敗
      }
    })
  );

  updates.sort((a, b) => new Date(b.date) - new Date(a.date));
  const result = updates.slice(0, take);
  cacheSet(cacheKey, result);
  return result;
}

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
