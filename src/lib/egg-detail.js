import { REPOS, ORG, findEgg, loadContributors, rawUrl, githubUrl, escapeHtml } from "./eggs-client.js";

function boolMark(v) {
  return v ? "✅" : "❌";
}

function commitsUrl(egg) {
  return `https://github.com/${ORG}/${egg.repo}/commits/${egg.branch}/${egg.path}`;
}

function renderContributors(contributors, commitHistoryUrl) {
  const shown = contributors.slice(0, 5);
  const extra = contributors.length - shown.length;
  const avatars = shown
    .map((c) => {
      const label = c.login || c.name || "";
      if (c.login) {
        return `<a href="${escapeHtml(commitHistoryUrl)}" target="_blank" rel="noopener" title="${escapeHtml(label)}">
          <img class="contributor-avatar" src="https://github.com/${escapeHtml(c.login)}.png?size=64" alt="${escapeHtml(label)}">
        </a>`;
      }
      const initial = escapeHtml((c.name || "?").charAt(0).toUpperCase());
      return `<a class="contributor-avatar contributor-fallback" href="${escapeHtml(commitHistoryUrl)}" target="_blank" rel="noopener" title="${escapeHtml(label)}">${initial}</a>`;
    })
    .join("");
  const more = extra > 0
    ? `<a class="contributor-more" href="${escapeHtml(commitHistoryUrl)}" target="_blank" rel="noopener">+${extra}</a>`
    : "";
  return `
    <div class="contributors-heading">👥 貢獻者（${contributors.length}）</div>
    <div class="contributor-avatars">${avatars}${more}</div>
  `;
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
    if (!egg) throw new Error("egg not found in repo tree");
  } catch (err) {
    console.error("找不到這個 Egg：", err);
    root.innerHTML = `<p class="status">找不到這個 Egg，可能已被移除或網址不正確。</p>`;
    return;
  }

  let data;
  let rawText;
  try {
    const res = await fetch(rawUrl(egg));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    rawText = await res.text();
    data = JSON.parse(rawText);
  } catch (err) {
    console.error("載入 Egg 內容失敗：", err);
    root.innerHTML = `<p class="status">載入這個 Egg 的內容時發生問題，請稍後再試。</p>`;
    return;
  }

  document.title = `${data.name || egg.name} | Pterodactyl-TW Eggs`;

  const importUrl = rawUrl(egg);
  const repoMeta = REPOS[repoId];
  const repoPagePath = { games: "/games/", applications: "/applications/", languages: "/languages/" }[repoId];
  const issueUrl = "https://pterodactyl.tw/discord";

  const dockerImages = data.docker_images ? Object.entries(data.docker_images) : [];
  const dockerRows = dockerImages
    .map(([name, image]) => `
      <tr>
        <td><code class="docker-code">${escapeHtml(name)}</code></td>
        <td><code class="docker-code">${escapeHtml(image)}</code></td>
      </tr>
    `)
    .join("");

  const variables = data.variables || [];
  const variablesHtml = variables
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

    <div class="detail-card">
      <div class="detail-card-top">
        <div>
          <h1>${escapeHtml(data.name || egg.name)}</h1>
          <span class="badge">${escapeHtml(egg.category)}</span>
        </div>
        <div class="actions-row">
          <button class="btn primary" id="download-egg-btn">⬇ 下載 Egg</button>
          <button id="copy-url-btn">⧉ 複製網址</button>
          <a class="btn" href="${escapeHtml(issueUrl)}" target="_blank" rel="noopener">⚠ 回報問題</a>
        </div>
      </div>
      <p class="egg-description">${escapeHtml(data.description || "（無描述）")}</p>
      <div id="contributors-box" class="contributors-row"><span class="status">正在載入貢獻者名單...</span></div>
    </div>

    <div class="accordion">
      <details open>
        <summary>README</summary>
        <div class="accordion-body">
          <h2>${escapeHtml(data.name || egg.name)}</h2>
          <p>${escapeHtml(data.description || "（此 Egg 尚無詳細說明）")}</p>
          <p class="install-meta">來源路徑：<code>${escapeHtml(egg.path)}</code>，來源倉庫：
            <a href="${escapeHtml(githubUrl(egg))}" target="_blank" rel="noopener">${escapeHtml(egg.repo)}</a>
          </p>
        </div>
      </details>

      ${dockerRows ? `
        <details>
          <summary>Docker 映像檔 (${dockerImages.length})</summary>
          <div class="accordion-body">
            <table class="docker-table">
              <thead><tr><th>名稱</th><th>映像檔</th></tr></thead>
              <tbody>${dockerRows}</tbody>
            </table>
          </div>
        </details>
      ` : ""}

      ${data.startup ? `
        <details>
          <summary>啟動指令</summary>
          <div class="accordion-body">
            <pre class="script-block">${escapeHtml(data.startup)}</pre>
          </div>
        </details>
      ` : ""}

      ${variablesHtml ? `
        <details>
          <summary>變數設定 (${variables.length})</summary>
          <div class="accordion-body">${variablesHtml}</div>
        </details>
      ` : ""}

      ${install ? `
        <details>
          <summary>安裝腳本</summary>
          <div class="accordion-body">
            <div class="install-meta">容器映像檔：<code>${escapeHtml(install.container || "-")}</code> ・ 進入點：<code>${escapeHtml(install.entrypoint || "-")}</code></div>
            <pre class="script-block">${escapeHtml(install.script || "")}</pre>
          </div>
        </details>
      ` : ""}
    </div>
  `;

  document.getElementById("copy-url-btn").onclick = () => {
    navigator.clipboard.writeText(importUrl).then(() => {
      const btn = document.getElementById("copy-url-btn");
      btn.textContent = "已複製！";
      setTimeout(() => { btn.textContent = "⧉ 複製網址"; }, 1500);
    });
  };

  document.getElementById("download-egg-btn").onclick = () => {
    // 跨網域的連結加 download 屬性瀏覽器不會強制下載，只會直接開啟，
    // 所以改成用 Blob 觸發真正的檔案下載。
    const blob = new Blob([rawText], { type: "application/json" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = egg.path.split("/").pop();
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  };

  const contributorsBox = document.getElementById("contributors-box");
  try {
    const contributors = await loadContributors(egg);
    contributorsBox.innerHTML = contributors.length ? renderContributors(contributors, commitsUrl(egg)) : "";
  } catch (_) {
    contributorsBox.innerHTML = "";
  }
}
