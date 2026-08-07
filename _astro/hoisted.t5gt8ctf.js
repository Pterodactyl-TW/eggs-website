import{R as b,f as E,e as a,r as v,g as k,l as T}from"./eggs-client.QxOMjQGX.js";function $(n){return n?"✅":"❌"}function _(n){const o=n.slice(0,5),r=n.length-o.length,i=o.map(s=>{if(s.login)return`<a href="https://github.com/${a(s.login)}" target="_blank" rel="noopener" title="${a(s.login)}">
          <img class="contributor-avatar" src="https://github.com/${a(s.login)}.png?size=64" alt="${a(s.login)}">
        </a>`;const c=a((s.name||"?").charAt(0).toUpperCase());return`<span class="contributor-avatar contributor-fallback" title="${a(s.name||"")}">${c}</span>`}).join(""),e=r>0?`<span class="contributor-more">+${r}</span>`:"";return`<span class="contributors-label">貢獻者：</span><div class="contributor-avatars">${i}${e}</div>`}async function H(n){const o=new URLSearchParams(location.search),r=o.get("repo"),i=o.get("path");if(!r||!i||!b[r]){n.innerHTML='<p class="status">找不到這個 Egg，網址參數不正確。</p>';return}n.innerHTML='<p class="status">正在載入 Egg 資料...</p>';let e;try{if(e=await E(r,i),!e)throw new Error("在倉庫中找不到這個 Egg 檔案")}catch(t){n.innerHTML=`<p class="status">載入失敗：${a(t.message)}</p>`;return}let s;try{const t=await fetch(v(e));if(!t.ok)throw new Error(`HTTP ${t.status}`);s=await t.json()}catch(t){n.innerHTML=`<p class="status">載入 Egg 內容失敗：${a(t.message)}</p>`;return}document.title=`${s.name||e.name} | Pterodactyl-TW Eggs`;const c=v(e),h=b[r],y={games:"/games/",applications:"/applications/",languages:"/languages/"}[r],f=`https://github.com/Pterodactyl-TW/${e.repo}/issues/new?title=${encodeURIComponent(`[問題回報] ${s.name||e.name}`)}`,d=s.docker_images?Object.entries(s.docker_images):[],p=d.map(([t,w])=>`<tr><td>${a(t)}</td><td><code>${a(w)}</code></td></tr>`).join(""),m=s.variables||[],g=m.map(t=>`
      <div class="variable-card">
        <h3>${a(t.name)}</h3>
        <div class="var-desc">${a(t.description||"")}</div>
        <div class="var-meta">
          <div><span class="label">環境變數：</span><code>${a(t.env_variable)}</code></div>
          <div><span class="label">預設值：</span>${a(t.default_value||"無")}</div>
          <div><span class="label">使用者可見：</span>${$(t.user_viewable)}</div>
          <div><span class="label">使用者可編輯：</span>${$(t.user_editable)}</div>
          <div><span class="label">驗證規則：</span><code>${a(t.rules||"")}</code></div>
        </div>
      </div>
    `).join(""),l=s.scripts?.installation;n.innerHTML=`
    <div class="breadcrumb">
      <a href="/">首頁</a> / <a href="${a(y)}">${a(h.label)}</a> / ${a(s.name||e.name)}
    </div>

    <div class="detail-card">
      <div class="detail-card-top">
        <div>
          <h1>${a(s.name||e.name)}</h1>
          <span class="badge">${a(e.category)}</span>
        </div>
        <div class="actions-row">
          <a class="btn primary" href="${a(c)}" download target="_blank" rel="noopener">⬇ 下載 Egg</a>
          <button id="copy-url-btn">⧉ 複製網址</button>
          <a class="btn" href="${a(f)}" target="_blank" rel="noopener">⚠ 回報問題</a>
        </div>
      </div>
      <p class="egg-description">${a(s.description||"（無描述）")}</p>
      <div id="contributors-box" class="contributors-row"><span class="status">正在載入貢獻者名單...</span></div>
    </div>

    <div class="accordion">
      <details open>
        <summary>README</summary>
        <div class="accordion-body">
          <h2>${a(s.name||e.name)}</h2>
          <p>${a(s.description||"（此 Egg 尚無詳細說明）")}</p>
          <p class="install-meta">來源路徑：<code>${a(e.path)}</code>，來源倉庫：
            <a href="${a(k(e))}" target="_blank" rel="noopener">${a(e.repo)}</a>
          </p>
        </div>
      </details>

      ${p?`
        <details>
          <summary>Docker 映像檔 (${d.length})</summary>
          <div class="accordion-body">
            <table class="docker-table">
              <thead><tr><th>名稱</th><th>映像檔</th></tr></thead>
              <tbody>${p}</tbody>
            </table>
          </div>
        </details>
      `:""}

      ${s.startup?`
        <details>
          <summary>啟動指令</summary>
          <div class="accordion-body">
            <pre class="script-block">${a(s.startup)}</pre>
          </div>
        </details>
      `:""}

      ${g?`
        <details>
          <summary>變數設定 (${m.length})</summary>
          <div class="accordion-body">${g}</div>
        </details>
      `:""}

      ${l?`
        <details>
          <summary>安裝腳本</summary>
          <div class="accordion-body">
            <div class="install-meta">容器映像檔：<code>${a(l.container||"-")}</code> ・ 進入點：<code>${a(l.entrypoint||"-")}</code></div>
            <pre class="script-block">${a(l.script||"")}</pre>
          </div>
        </details>
      `:""}
    </div>
  `,document.getElementById("copy-url-btn").onclick=()=>{navigator.clipboard.writeText(c).then(()=>{const t=document.getElementById("copy-url-btn");t.textContent="已複製！",setTimeout(()=>{t.textContent="⧉ 複製網址"},1500)})};const u=document.getElementById("contributors-box");try{const t=await T(e);u.innerHTML=t.length?_(t):""}catch{u.innerHTML=""}}H(document.getElementById("egg-detail-root"));
