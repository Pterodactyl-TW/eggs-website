import{R as h,f as w,e,r as m,g as E,l as T}from"./eggs-client.QxOMjQGX.js";function v(n){return n?"✅":"❌"}async function k(n){const l=new URLSearchParams(location.search),i=l.get("repo"),d=l.get("path");if(!i||!d||!h[i]){n.innerHTML='<p class="status">找不到這個 Egg，網址參數不正確。</p>';return}n.innerHTML='<p class="status">正在載入 Egg 資料...</p>';let a;try{if(a=await w(i,d),!a)throw new Error("在倉庫中找不到這個 Egg 檔案")}catch(t){n.innerHTML=`<p class="status">載入失敗：${e(t.message)}</p>`;return}let s;try{const t=await fetch(m(a));if(!t.ok)throw new Error(`HTTP ${t.status}`);s=await t.json()}catch(t){n.innerHTML=`<p class="status">載入 Egg 內容失敗：${e(t.message)}</p>`;return}document.title=`${s.name||a.name} | Pterodactyl-TW Eggs`;const p=m(a),$=h[i],y={games:"/games/",applications:"/applications/",languages:"/languages/"}[i],f=`https://github.com/Pterodactyl-TW/${a.repo}/issues/new?title=${encodeURIComponent(`[問題回報] ${s.name||a.name}`)}`,g=s.docker_images?Object.entries(s.docker_images).map(([t,r])=>`<tr><td>${e(t)}</td><td><code>${e(r)}</code></td></tr>`).join(""):"",b=(s.variables||[]).map(t=>`
      <div class="variable-card">
        <h3>${e(t.name)}</h3>
        <div class="var-desc">${e(t.description||"")}</div>
        <div class="var-meta">
          <div><span class="label">環境變數：</span><code>${e(t.env_variable)}</code></div>
          <div><span class="label">預設值：</span>${e(t.default_value||"無")}</div>
          <div><span class="label">使用者可見：</span>${v(t.user_viewable)}</div>
          <div><span class="label">使用者可編輯：</span>${v(t.user_editable)}</div>
          <div><span class="label">驗證規則：</span><code>${e(t.rules||"")}</code></div>
        </div>
      </div>
    `).join(""),o=s.scripts?.installation;n.innerHTML=`
    <div class="breadcrumb">
      <a href="/">首頁</a> / <a href="${e(y)}">${e($.label)}</a> / ${e(s.name||a.name)}
    </div>

    <div class="egg-detail-header">
      <h1>${e(s.name||a.name)}</h1>
      <div class="category-label">${e(a.category)} · ${e(a.path)}</div>
    </div>

    <div class="actions-row">
      <a class="btn primary" href="${e(p)}" download target="_blank" rel="noopener">下載 Egg</a>
      <button id="copy-url-btn">複製匯入網址</button>
      <a class="btn" href="${e(f)}" target="_blank" rel="noopener">回報問題</a>
      <a class="btn" href="${e(E(a))}" target="_blank" rel="noopener">在 GitHub 上查看</a>
    </div>

    <p class="egg-description">${e(s.description||"（無描述）")}</p>

    <div id="contributors-box" class="contributors"><span class="status">正在載入貢獻者名單...</span></div>

    ${g?`
      <div class="detail-section">
        <h2>Docker 映像檔</h2>
        <table class="docker-table">
          <thead><tr><th>名稱</th><th>映像檔</th></tr></thead>
          <tbody>${g}</tbody>
        </table>
      </div>
    `:""}

    ${b?`
      <div class="detail-section">
        <h2>變數設定</h2>
        ${b}
      </div>
    `:""}

    ${o?`
      <div class="detail-section">
        <h2>安裝腳本</h2>
        <div class="install-meta">容器映像檔：<code>${e(o.container||"-")}</code> ・ 進入點：<code>${e(o.entrypoint||"-")}</code></div>
        <pre class="script-block">${e(o.script||"")}</pre>
      </div>
    `:""}
  `,document.getElementById("copy-url-btn").onclick=()=>{navigator.clipboard.writeText(p).then(()=>{const t=document.getElementById("copy-url-btn");t.textContent="已複製！",setTimeout(()=>{t.textContent="複製匯入網址"},1500)})};const c=document.getElementById("contributors-box");try{const t=await T(a);t.length?c.innerHTML=t.map(r=>{const u=r.login||r.name;return r.login?`<a class="contributor-chip" href="https://github.com/${e(r.login)}" target="_blank" rel="noopener">${e(u)}</a>`:`<span class="contributor-chip">${e(u)}</span>`}).join(""):c.innerHTML=""}catch{c.innerHTML=""}}k(document.getElementById("egg-detail-root"));
