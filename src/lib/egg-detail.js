import { marked } from "marked";
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import { REPOS, ORG, findEgg, loadContributors, rawUrl, githubUrl, escapeHtml } from "./eggs-client.js";
import { ICONS } from "./icons.js";

hljs.registerLanguage("bash", bash);

function highlightScript(text) {
  try {
    return hljs.highlight(text, { language: "bash" }).value;
  } catch (_) {
    return escapeHtml(text);
  }
}

// 讓 README 內的程式碼區塊也套用同一套語法上色與樣式
marked.use({
  renderer: {
    code({ text }) {
      return `<pre class="script-block"><code class="hljs language-bash">${highlightScript(text)}</code></pre>`;
    },
  },
});

function commitsUrl(egg) {
  return `https://github.com/${ORG}/${egg.repo}/commits/${egg.branch}/${egg.path}`;
}

// 嘗試抓取 egg 檔案所在資料夾底下的 README.md（大小寫皆嘗試），
// 找不到就回傳 null，由呼叫端退回使用 egg 的 description 欄位。
async function fetchFolderReadme(egg) {
  const folder = egg.path.split("/").slice(0, -1).join("/");
  const candidates = ["README.md", "Readme.md", "readme.md"];
  for (const filename of candidates) {
    const url = `https://raw.githubusercontent.com/${ORG}/${egg.repo}/${egg.branch}/${folder ? folder + "/" : ""}${filename}`;
    try {
      const res = await fetch(url);
      if (res.ok) return res.text();
    } catch (_) {
      // 試下一個檔名
    }
  }
  return null;
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
    <div class="contributors-heading"><span class="icon-wrap">${ICONS.users}</span> 貢獻者（${contributors.length}）</div>
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
        <td class="docker-name">${escapeHtml(name)}</td>
        <td><code class="docker-code">${escapeHtml(image)}</code></td>
      </tr>
    `)
    .join("");

  const variables = data.variables || [];
  const variablesHtml = variables
    .map((v) => `
      <div class="variable-card">
        <div class="variable-card-top">
          <h3>${escapeHtml(v.name)}</h3>
          <code class="env-chip">${escapeHtml(v.env_variable)}</code>
        </div>
        ${v.description ? `<p class="var-desc">${escapeHtml(v.description)}</p>` : ""}
        <div class="var-pills">
          <span class="var-pill">預設值：<code>${escapeHtml(v.default_value || "無")}</code></span>
          <span class="var-pill ${v.user_viewable ? "on" : "off"}"><span class="icon-wrap">${v.user_viewable ? ICONS.eye : ICONS.eyeOff}</span> ${v.user_viewable ? "使用者可見" : "使用者不可見"}</span>
          <span class="var-pill ${v.user_editable ? "on" : "off"}"><span class="icon-wrap">${v.user_editable ? ICONS.edit : ICONS.lock}</span> ${v.user_editable ? "可編輯" : "唯讀"}</span>
          ${v.rules ? `<span class="var-pill">規則：<code>${escapeHtml(v.rules)}</code></span>` : ""}
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
          <button class="btn primary" id="download-egg-btn"><span class="icon-wrap">${ICONS.download}</span> 下載 Egg</button>
          <button id="copy-url-btn"><span class="icon-wrap">${ICONS.copy}</span> 複製網址</button>
          <a class="btn" href="${escapeHtml(issueUrl)}" target="_blank" rel="noopener"><span class="icon-wrap">${ICONS.alert}</span> 回報問題</a>
        </div>
      </div>
      <p class="egg-description">${escapeHtml(data.description || "（無描述）")}</p>
      <div id="contributors-box" class="contributors-row"><span class="status">正在載入貢獻者名單...</span></div>
    </div>

    <div class="accordion">
      <details open>
        <summary>README</summary>
        <div class="accordion-body markdown-body" id="readme-body">
          <p class="status">正在載入 README...</p>
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
            <pre class="script-block"><code class="hljs language-bash">${highlightScript(data.startup)}</code></pre>
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
            <div class="install-meta">
              <div>容器映像檔：<code>${escapeHtml(install.container || "-")}</code></div>
              <div>進入點：<code>${escapeHtml(install.entrypoint || "-")}</code></div>
            </div>
            <pre class="script-block"><code class="hljs language-bash">${highlightScript(install.script || "")}</code></pre>
          </div>
        </details>
      ` : ""}
    </div>
  `;

  document.getElementById("copy-url-btn").onclick = () => {
    navigator.clipboard.writeText(importUrl).then(() => {
      const btn = document.getElementById("copy-url-btn");
      btn.innerHTML = `<span class="icon-wrap">${ICONS.copy}</span> 已複製！`;
      setTimeout(() => { btn.innerHTML = `<span class="icon-wrap">${ICONS.copy}</span> 複製網址`; }, 1500);
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

  const readmeBody = document.getElementById("readme-body");
  try {
    const readmeMarkdown = await fetchFolderReadme(egg);
    if (readmeMarkdown) {
      readmeBody.innerHTML = marked.parse(readmeMarkdown);
    } else {
      readmeBody.innerHTML = `
        <h2>${escapeHtml(data.name || egg.name)}</h2>
        <p>${escapeHtml(data.description || "（此 Egg 尚無詳細說明）")}</p>
      `;
    }
  } catch (err) {
    console.error("載入 README 失敗：", err);
    readmeBody.innerHTML = `
      <h2>${escapeHtml(data.name || egg.name)}</h2>
      <p>${escapeHtml(data.description || "（此 Egg 尚無詳細說明）")}</p>
    `;
  }
  readmeBody.insertAdjacentHTML("beforeend", `
    <p class="install-meta">來源路徑：<code>${escapeHtml(egg.path)}</code>，來源倉庫：
      <a href="${escapeHtml(githubUrl(egg))}" target="_blank" rel="noopener">${escapeHtml(egg.repo)}</a>
    </p>
  `);

  const contributorsBox = document.getElementById("contributors-box");
  try {
    const contributors = await loadContributors(egg);
    contributorsBox.innerHTML = contributors.length ? renderContributors(contributors, commitsUrl(egg)) : "";
  } catch (_) {
    contributorsBox.innerHTML = "";
  }
}
