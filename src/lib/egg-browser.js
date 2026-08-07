import { loadRepoEggs, loadAllEggs, escapeHtml, eggDetailUrl } from "./eggs-client.js";

const MAX_CATEGORY_CHIPS = 30;

export async function mountEggBrowser({ repoId, gridEl, statusEl, searchEl, categoryFiltersEl, countLabelEl }) {
  const state = { eggs: [], activeCategory: "all", searchTerm: "" };

  if (countLabelEl) countLabelEl.textContent = "載入中...";
  try {
    state.eggs = repoId ? await loadRepoEggs(repoId) : (await loadAllEggs()).eggs;
    if (countLabelEl) countLabelEl.textContent = `${state.eggs.length} 個 Egg`;
    statusEl.textContent = "";
  } catch (err) {
    console.error("載入 Egg 清單失敗：", err);
    if (countLabelEl) countLabelEl.textContent = "";
    statusEl.textContent = "載入 Egg 清單時發生問題，請稍後再試。";
    return;
  }

  function buildCategoryFilters() {
    if (!categoryFiltersEl) return;
    categoryFiltersEl.innerHTML = "";
    const categories = [...new Set(state.eggs.map((e) => e.category))].sort();
    if (categories.length > MAX_CATEGORY_CHIPS) return;

    const all = document.createElement("button");
    all.className = "filter-chip" + (state.activeCategory === "all" ? " active" : "");
    all.textContent = "全部分類";
    all.onclick = () => { state.activeCategory = "all"; buildCategoryFilters(); render(); };
    categoryFiltersEl.appendChild(all);

    categories.forEach((cat) => {
      const chip = document.createElement("button");
      chip.className = "filter-chip" + (state.activeCategory === cat ? " active" : "");
      chip.textContent = cat;
      chip.onclick = () => { state.activeCategory = cat; buildCategoryFilters(); render(); };
      categoryFiltersEl.appendChild(chip);
    });
  }

  function filteredEggs() {
    const term = state.searchTerm.trim().toLowerCase();
    return state.eggs.filter((egg) => {
      if (state.activeCategory !== "all" && egg.category !== state.activeCategory) return false;
      if (term && !egg.name.toLowerCase().includes(term) && !egg.path.toLowerCase().includes(term)) return false;
      return true;
    });
  }

  function render() {
    const list = filteredEggs();
    gridEl.innerHTML = "";
    if (!list.length) {
      gridEl.innerHTML = `<p class="status">找不到符合條件的 Egg。</p>`;
      return;
    }
    list.slice(0, 400).forEach((egg) => {
      const card = document.createElement("a");
      card.className = "egg-card";
      card.href = eggDetailUrl(egg);
      card.innerHTML = `
        <h3>${escapeHtml(egg.name)}</h3>
        <div class="egg-desc">${escapeHtml(egg.path)}</div>
        <span class="egg-card-link">查看詳細 →</span>
      `;
      gridEl.appendChild(card);
    });
  }

  buildCategoryFilters();
  render();

  if (searchEl) {
    let debounce;
    searchEl.addEventListener("input", (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => { state.searchTerm = e.target.value; render(); }, 150);
    });
  }

  return { getEggs: () => state.eggs };
}
