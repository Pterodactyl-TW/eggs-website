// 共用的即時資料抓取邏輯：從 Pterodactyl-TW 的三個 egg 倉庫抓取即時資料，
// 供 Home / Games / Applications / Languages 頁面共用。

export const ORG = "Pterodactyl-TW";

export const REPOS = {
  games: { key: "game-eggs", label: "遊戲", icon: "🎮" },
  applications: { key: "application-eggs", label: "應用程式", icon: "📦" },
  languages: { key: "generic-eggs", label: "語言", icon: "💻" },
};

const CACHE_TTL_MS = 15 * 60 * 1000;
// api.github.com 未登入時每小時只有 60 次配額，commit 相關查詢很容易把它用光，
// 所以像「貢獻者」這類非必要功能快取要拉長。
const GITHUB_API_CACHE_TTL_MS = 60 * 60 * 1000;

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

// 優先透過 jsDelivr 的 data API 取得檔案樹：不佔用 api.github.com 每小時 60 次的配額，
// 且有 CDN 快取，速度更快也更穩定。只有 jsDelivr 失敗時才退回 GitHub API。
async function fetchRepoTreeViaJsdelivr(repoKey) {
  for (const branch of ["main", "master"]) {
    try {
      const data = await fetchJson(
        `https://data.jsdelivr.com/v1/packages/gh/${ORG}/${repoKey}@${branch}?structure=flat`
      );
      const tree = (data.files || [])
        .filter((f) => /^egg-.*\.json$/i.test(f.name.split("/").pop()))
        .map((f) => ({ path: f.name.replace(/^\//, "") }));
      if (tree.length) return { branch, tree };
    } catch (_) {
      // 試下一個分支名稱
    }
  }
  throw new Error("jsDelivr 沒有回傳任何 Egg 檔案");
}

async function fetchRepoTreeViaGithubApi(repoKey) {
  for (const branch of ["main", "master"]) {
    try {
      const data = await fetchJson(
        `https://api.github.com/repos/${ORG}/${repoKey}/git/trees/${branch}?recursive=1`
      );
      const tree = (data.tree || []).filter(
        (item) => item.type === "blob" && /^egg-.*\.json$/i.test(item.path.split("/").pop())
      );
      return { branch, tree };
    } catch (_) {
      // 試下一個分支名稱
    }
  }
  throw new Error(`無法取得 ${repoKey} 的檔案樹`);
}

async function fetchRepoTree(repoKey) {
  const cacheKey = `eggs-tw:${repoKey}:tree`;
  const cached = cacheGet(cacheKey, CACHE_TTL_MS);
  if (cached) return cached;

  let result;
  try {
    result = await fetchRepoTreeViaJsdelivr(repoKey);
  } catch (_) {
    result = await fetchRepoTreeViaGithubApi(repoKey);
  }
  cacheSet(cacheKey, result);
  return result;
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
  const cached = cacheGet(cacheKey, GITHUB_API_CACHE_TTL_MS);
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

// 「最近更新」清單改為部署時透過 scripts/fetch-recent.mjs 預先產生的 public/recent-eggs.json，
// 避免每個訪客都即時呼叫 api.github.com 的 commits API（未登入額度很容易被打爆）。
// 本機開發環境沒有這個檔案時，由呼叫端（index.astro）自行退回顯示隨機抽樣的 Egg。
export async function loadRecentlyUpdated() {
  const res = await fetch("/recent-eggs.json");
  if (!res.ok) throw new Error("尚未產生最近更新資料");
  return res.json();
}

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
