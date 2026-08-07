import{b as m,e as s,d as E,c as f}from"./eggs-client.QxOMjQGX.js";const p=document.getElementById("search-input"),l=document.getElementById("search-results"),o=document.getElementById("default-sections"),c=document.getElementById("status"),r=document.getElementById("egg-grid"),a=document.getElementById("recent-status"),y=document.getElementById("recent-grid");let u=[],g=!1;function h(e,t=""){const n=document.createElement("a");return n.className="egg-card",n.href=f(e),n.innerHTML=`
      <h3>${s(e.name)}</h3>
      <div class="egg-desc">${s(e.path)}</div>
      <div class="egg-tags">
        <span class="egg-tag">${s(e.repoLabel)}</span>
        <span class="egg-tag">${s(e.category)}</span>
      </div>
      ${t}
    `,n}async function C(){if(!g){c.textContent="正在從 GitHub 即時載入 Egg 清單...";try{const{eggs:e,errors:t}=await m();u=e,g=!0,c.textContent=t.length?`已載入 ${e.length} 個 Egg，但部分來源載入失敗：${t.join("；")}`:`已即時載入 ${e.length} 個 Egg。`}catch(e){c.textContent=`載入失敗：${e.message}`}}}function $(e){r.innerHTML="";const t=u.filter(n=>n.name.toLowerCase().includes(e)||n.path.toLowerCase().includes(e));if(!t.length){r.innerHTML=`<p class="status">找不到符合「${s(e)}」的 Egg。</p>`;return}t.slice(0,60).forEach(n=>r.appendChild(h(n)))}let i;p.addEventListener("input",async e=>{const t=e.target.value.trim().toLowerCase();if(clearTimeout(i),!t){l.hidden=!0,o.hidden=!1;return}i=setTimeout(async()=>{o.hidden=!0,l.hidden=!1,await C(),$(t)},150)});async function L(){a.textContent="正在載入最近更新的 Egg...";try{const e=await E();if(a.textContent="",!e.length){a.textContent="目前沒有可顯示的最近更新資料。";return}e.forEach(({egg:t,date:n})=>{const d=n?new Date(n).toLocaleDateString("zh-TW"):"";y.appendChild(h(t,d?`<div class="egg-date">最後更新：${d}</div>`:""))})}catch(e){a.textContent=`載入失敗：${e.message}`}}L();
