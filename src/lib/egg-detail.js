import { REPOS, findEgg, loadContributors, rawUrl, githubUrl, escapeHtml } from "./eggs-client.js";

function boolMark(v) {
  return v ? "✅" : "❌";
}

export async function renderEggDetail(root) {
  const params = new URLSearchParams(location.search);
  const repoId = params.get("repo");
  const path = params.get("path");

  if (!repoId || !path || !REPOS[repoId]) {
    root.innerHTML = `<p class="status">找不到這個 Egg，網址參數不正確。</p>`;
    return;
  }

  root.innerHTML = `<p class="status">正在載入 Egg 資料...</p>`;

  let egg;
  try {
    egg = await findEgg(repoId, path);
    if (!egg) throw new Error("在倉庫中找不到這個 Egg 檔案");
  } catch (err) {
    root.innerHTML = `<p class="status">載入失敗：${escapeHtml(err.message)}</p>`;
    return;
  }

  let data;
  try {
    const res = await fetch(rawUrl(egg));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    root.innerHTML = `<p class="status">載入 Egg 內容失敗：${escapeHtml(err.message)}</p>`;
    return;
  }

  document.title = `${data.name || egg.name} | Pterodactyl-TW Eggs`;

  const importUrl = rawUrl(egg);
  const repoMeta = REPOS[repoId];
  const repoPagePath = { games: "/games/", applications: "/applications/", languages: "/languages/" }[repoId];
  const issueUrl = `https://github.com/Pterodactyl-TW/${egg.repo}/issues/new?title=${encodeURIComponent(`[問題回報] ${data.name || egg.name}`)}`;

  const dockerRows = data.docker_images
    ? Object.entries(data.docker_images)
        .map(([name, image]) => `<tr><td>${escapeHtml(name)}</td><td><code>${escapeHtml(image)}</code></td></tr>`)
        .join("")
    : "";

  const variablesHtml = (data.variables || [])
    .map((v) => `
      <div class="variable-card">
        <h3>${escapeHtml(v.name)}</h3>
        <div class="var-desc">${escapeHtml(v.description || "")}</div>
        <div class="var-meta">
          <div><span class="label">環境變數：</span><code>${escapeHtml(v.env_variable)}</code></div>
          <div><span class="label">預設值：</span>${escapeHtml(v.default_value || "無")}</div>
          <div><span class="label">使用者可見：</span>${boolMark(v.user_viewable)}</div>
          <div><span class="label">使用者可編輯：</span>${boolMark(v.user_editable)}</div>
          <div><span class="label">驗證規則：</span><code>${escapeHtml(v.rules || "")}</code></div>
        </div>
      </div>
    `)
    .join("");

  const install = data.scripts?.installation;

  root.innerHTML = `
    <div class="breadcrumb">
      <a href="/">首頁</a> / <a href="${escapeHtml(repoPagePath)}">${escapeHtml(repoMeta.label)}</a> / ${escapeHtml(data.name || egg.name)}
    </div>

    <div class="egg-detail-header">
      <h1>${escapeHtml(data.name || egg.name)}</h1>
      <div class="category-label">${escapeHtml(egg.category)} · ${escapeHtml(egg.path)}</div>
    </div>

    <div class="actions-row">
      <a class="btn primary" href="${escapeHtml(importUrl)}" download target="_blank" rel="noopener">下載 Egg</a>
      <button id="copy-url-btn">複製匯入網址</button>
      <a class="btn" href="${escapeHtml(issueUrl)}" target="_blank" rel="noopener">回報問題</a>
      <a class="btn" href="${escapeHtml(githubUrl(egg))}" target="_blank" rel="noopener">在 GitHub 上查看</a>
    </div>

    <p class="egg-description">${escapeHtml(data.description || "（無描述）")}</p>

    <div id="contributors-box" class="contributors"><span class="status">正在載入貢獻者名單...</span></div>

    ${dockerRows ? `
      <div class="detail-section">
        <h2>Docker 映像檔</h2>
        <table class="docker-table">
          <thead><tr><th>名稱</th><th>映像檔</th></tr></thead>
          <tbody>${dockerRows}</tbody>
        </table>
      </div>
    ` : ""}

    ${variablesHtml ? `
      <div class="detail-section">
        <h2>變數設定</h2>
        ${variablesHtml}
      </div>
    ` : ""}

    ${install ? `
      <div class="detail-section">
        <h2>安裝腳本</h2>
        <div class="install-meta">容器映像檔：<code>${escapeHtml(install.container || "-")}</code> ・ 進入點：<code>${escapeHtml(install.entrypoint || "-")}</code></div>
        <pre class="script-block">${escapeHtml(install.script || "")}</pre>
      </div>
    ` : ""}
  `;

  document.getElementById("copy-url-btn").onclick = () => {
    navigator.clipboard.writeText(importUrl).then(() => {
      const btn = document.getElementById("copy-url-btn");
      btn.textContent = "已複製！";
      setTimeout(() => { btn.textContent = "複製匯入網址"; }, 1500);
    });
  };

  const contributorsBox = document.getElementById("contributors-box");
  try {
    const contributors = await loadContributors(egg);
    if (!contributors.length) {
      contributorsBox.innerHTML = "";
    } else {
      contributorsBox.innerHTML = contributors
        .map((c) => {
          const label = c.login || c.name;
          return c.login
            ? `<a class="contributor-chip" href="https://github.com/${escapeHtml(c.login)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`
            : `<span class="contributor-chip">${escapeHtml(label)}</span>`;
        })
        .join("");
    }
  } catch (_) {
    contributorsBox.innerHTML = "";
  }
}
