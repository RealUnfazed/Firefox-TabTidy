const els = {
  enabledToggle: document.getElementById("enabledToggle"),
  navBtns: Array.from(document.querySelectorAll(".tab-btn")),
  views: Array.from(document.querySelectorAll(".view")),
  thresholdHours: document.getElementById("thresholdHours"),
  thresholdSlider: document.getElementById("thresholdSlider"),
  thresholdUp: document.getElementById("thresholdUp"),
  thresholdDown: document.getElementById("thresholdDown"),
  themeGroup: document.getElementById("themeGroup"),
  modeGroup: document.getElementById("modeGroup"),
  excludePinned: document.getElementById("excludePinned"),
  excludeAudible: document.getElementById("excludeAudible"),
  whitelist: document.getElementById("whitelist"),
  saveBtn: document.getElementById("saveBtn"),
  saveMsg: document.getElementById("saveMsg"),
  openCount: document.getElementById("openCount"),
  archiveCount: document.getElementById("archiveCount"),
  openTabsList: document.getElementById("openTabsList"),
  openTabsEmpty: document.getElementById("openTabsEmpty"),
  archiveList: document.getElementById("archiveList"),
  archiveEmpty: document.getElementById("archiveEmpty"),
  sweepNowBtn: document.getElementById("sweepNowBtn"),
  clearArchiveBtn: document.getElementById("clearArchiveBtn"),
  toast: document.getElementById("toast"),
};

let toastTimer = null;
function showToast(text, ms = 2200) {
  els.toast.textContent = text;
  els.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), ms);
}

let currentSettings = { ...TC.DEFAULT_SETTINGS };

function send(message) {
  return browser.runtime.sendMessage(message);
}

/* ---------- View switching ---------- */

function switchView(view) {
  els.navBtns.forEach((btn) => btn.classList.toggle("active", btn.dataset.view === view));
  els.views.forEach((section) => section.classList.toggle("active", section.dataset.view === view));
}

els.navBtns.forEach((btn) => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});

/* ---------- Theme ---------- */

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme || "system");
}

els.themeGroup.addEventListener("change", async (event) => {
  const theme = event.target.value;
  applyTheme(theme);
  await saveSettings({ ...currentSettings, theme });
});

/* ---------- Settings form ---------- */

function populateForm(settings) {
  els.enabledToggle.checked = settings.enabled;
  els.thresholdHours.value = settings.thresholdHours;
  els.thresholdSlider.value = Math.min(settings.thresholdHours, Number(els.thresholdSlider.max));
  els.modeGroup.querySelectorAll("input[name=mode]").forEach((input) => {
    input.checked = input.value === settings.mode;
  });
  els.themeGroup.querySelectorAll("input[name=theme]").forEach((input) => {
    input.checked = input.value === (settings.theme || "system");
  });
  els.excludePinned.checked = settings.excludePinned;
  els.excludeAudible.checked = settings.excludeAudible;
  els.whitelist.value = settings.whitelist.join("\n");
}

function collectForm() {
  const mode = els.modeGroup.querySelector("input[name=mode]:checked")?.value || "archive";
  return {
    ...currentSettings,
    enabled: els.enabledToggle.checked,
    thresholdHours: TC.clampHours(els.thresholdHours.value),
    mode,
    excludePinned: els.excludePinned.checked,
    excludeAudible: els.excludeAudible.checked,
    whitelist: TC.parseWhitelist(els.whitelist.value),
  };
}

async function loadSettings() {
  const { settings } = await browser.storage.local.get("settings");
  currentSettings = { ...TC.DEFAULT_SETTINGS, ...(settings || {}) };
  applyTheme(currentSettings.theme);
  populateForm(currentSettings);
}

async function saveSettings(settings) {
  currentSettings = settings;
  await browser.storage.local.set({ settings });
}

els.thresholdHours.addEventListener("input", () => {
  const hours = TC.clampHours(els.thresholdHours.value || 0);
  els.thresholdSlider.value = Math.min(hours, Number(els.thresholdSlider.max));
});

els.thresholdSlider.addEventListener("input", () => {
  els.thresholdHours.value = els.thresholdSlider.value;
});

els.thresholdUp.addEventListener("click", () => {
  els.thresholdHours.value = TC.clampHours(Number(els.thresholdHours.value || 0) + 0.5);
  els.thresholdHours.dispatchEvent(new Event("input"));
});

els.thresholdDown.addEventListener("click", () => {
  els.thresholdHours.value = TC.clampHours(Number(els.thresholdHours.value || 0) - 0.5);
  els.thresholdHours.dispatchEvent(new Event("input"));
});

els.enabledToggle.addEventListener("change", async () => {
  await saveSettings({ ...currentSettings, enabled: els.enabledToggle.checked });
});

els.saveBtn.addEventListener("click", async () => {
  await saveSettings(collectForm());
  els.saveMsg.textContent = "Saved";
  els.saveMsg.classList.add("show");
  setTimeout(() => els.saveMsg.classList.remove("show"), 1600);
});

/* ---------- Open tabs view ---------- */

function faviconOrFallback(url) {
  const host = TC.hostnameOf(url);
  return host
    ? `https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(host)}`
    : "";
}

async function renderOpenTabs() {
  const tabs = await browser.tabs.query({});
  const now = Date.now();
  const settings = currentSettings;
  const thresholdMs = settings.thresholdHours * 3600 * 1000;

  const rows = tabs
    .map((tab) => {
      const lastAccessed = typeof tab.lastAccessed === "number" ? tab.lastAccessed : now;
      const idleMs = now - lastAccessed;
      return { tab, idleMs };
    })
    .sort((a, b) => b.idleMs - a.idleMs);

  els.openCount.textContent = tabs.length;
  els.openTabsList.innerHTML = "";
  els.openTabsEmpty.hidden = rows.length > 0;

  for (const { tab, idleMs } of rows) {
    const li = document.createElement("li");
    li.className = "tab-row";

    const excluded =
      tab.active ||
      (settings.excludePinned && tab.pinned) ||
      (settings.excludeAudible && tab.audible) ||
      TC.isProtectedUrl(tab.url) ||
      TC.matchesWhitelist(tab.url, settings.whitelist);

    const isDue = !excluded && idleMs >= thresholdMs;
    if (isDue) li.classList.add("due");

    const tags = [];
    if (tab.pinned) tags.push("Pinned");
    if (tab.audible) tags.push("Audio");
    if (tab.active) tags.push("Active");
    if (!tab.pinned && !tab.audible && !tab.active && TC.matchesWhitelist(tab.url, settings.whitelist)) {
      tags.push("Kept");
    }

    li.innerHTML = `
      <img class="favicon" src="${faviconOrFallback(tab.url)}" alt="" />
      <div class="tab-info">
        <p class="tab-title">${escapeHtml(tab.title || tab.url || "Untitled tab")}</p>
        <p class="tab-meta">
          ${tags.map((t) => `<span class="tag">${t}</span>`).join("")}
          <span>${escapeHtml(TC.hostnameOf(tab.url) || tab.url || "")}</span>
        </p>
      </div>
      <span class="idle-badge${isDue ? " due" : ""}">${TC.formatIdle(idleMs)}</span>
    `;
    els.openTabsList.appendChild(li);
  }
}

/* ---------- Archive view ---------- */

async function renderArchive() {
  const { archivedTabs } = await browser.storage.local.get("archivedTabs");
  const archive = Array.isArray(archivedTabs) ? archivedTabs : [];

  els.archiveCount.textContent = archive.length;
  els.archiveList.innerHTML = "";
  els.archiveEmpty.hidden = archive.length > 0;

  for (const entry of archive) {
    const li = document.createElement("li");
    li.className = "tab-row";
    li.dataset.archiveId = entry.archiveId;
    li.innerHTML = `
      <img class="favicon" src="${entry.favIconUrl || faviconOrFallback(entry.url)}" alt="" />
      <div class="tab-info">
        <p class="tab-title">${escapeHtml(entry.title || entry.url)}</p>
        <p class="tab-meta"><span>Closed ${TC.formatWhen(entry.closedAt)}</span></p>
      </div>
      <div class="row-actions">
        <button class="icon-btn restore" title="Reopen this tab">&#8635;</button>
        <button class="icon-btn delete" title="Remove from archive">&#10005;</button>
      </div>
    `;
    els.archiveList.appendChild(li);
  }
}

els.archiveList.addEventListener("click", async (event) => {
  const li = event.target.closest(".tab-row");
  if (!li) return;
  const archiveId = li.dataset.archiveId;

  if (event.target.closest(".restore")) {
    await send({ type: "restoreArchivedTab", archiveId });
    renderArchive();
    renderOpenTabs();
  } else if (event.target.closest(".delete")) {
    await send({ type: "deleteArchivedTab", archiveId });
    renderArchive();
  }
});

els.clearArchiveBtn.addEventListener("click", async () => {
  if (!confirm("Clear all archived tabs? This can't be undone.")) return;
  await send({ type: "clearArchive" });
  renderArchive();
});

els.sweepNowBtn.addEventListener("click", async () => {
  els.sweepNowBtn.disabled = true;
  els.sweepNowBtn.textContent = "Sweeping…";
  const result = await send({ type: "sweepNow" });
  await Promise.all([renderOpenTabs(), renderArchive()]);
  els.sweepNowBtn.disabled = false;
  els.sweepNowBtn.textContent = "Sweep now";
  if (result?.disabled) {
    showToast("Turn on Tab Cleaner first");
  } else {
    const n = result?.swept?.length || 0;
    showToast(n ? `Swept ${n} tab${n === 1 ? "" : "s"}` : "Nothing to sweep");
  }
});

/* ---------- Utils ---------- */

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ---------- Init ---------- */

async function init() {
  browser.action.setBadgeText({ text: "" });
  await loadSettings();
  await Promise.all([renderOpenTabs(), renderArchive()]);
  switchView("settings");
  setInterval(renderOpenTabs, 30000);
}

init();
