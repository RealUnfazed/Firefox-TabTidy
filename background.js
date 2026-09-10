// shared.js is loaded first via manifest.json's background.scripts array,
// so globalThis.TC is already available here — no importScripts() needed
// (Firefox background scripts run in a page-like context, not a worker).

const ALARM_NAME = "tab-cleaner-sweep";

async function getSettings() {
  const { settings } = await browser.storage.local.get("settings");
  return { ...globalThis.TC.DEFAULT_SETTINGS, ...(settings || {}) };
}

async function getArchive() {
  const { archivedTabs } = await browser.storage.local.get("archivedTabs");
  return Array.isArray(archivedTabs) ? archivedTabs : [];
}

async function ensureAlarm() {
  const alarm = await browser.alarms.get(ALARM_NAME);
  if (!alarm) {
    browser.alarms.create(ALARM_NAME, { periodInMinutes: 5, delayInMinutes: 1 });
  }
}

async function archiveTab(tab) {
  const archive = await getArchive();
  archive.unshift({
    archiveId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    url: tab.url,
    title: tab.title || tab.url,
    favIconUrl: tab.favIconUrl || "",
    closedAt: Date.now(),
  });
  await browser.storage.local.set({
    archivedTabs: archive.slice(0, globalThis.TC.MAX_ARCHIVE_ENTRIES),
  });
}

async function setBadge(count) {
  if (count > 0) {
    await browser.action.setBadgeBackgroundColor({ color: "#2F6E5C" });
    await browser.action.setBadgeText({ text: String(count) });
  }
}

async function sweep() {
  const settings = await getSettings();
  if (!settings.enabled) return { swept: [], disabled: true };

  const thresholdMs = settings.thresholdHours * 3600 * 1000;
  const now = Date.now();
  const allTabs = await browser.tabs.query({});
  const swept = [];

  for (const tab of allTabs) {
    if (tab.active) continue; // never sweep the tab currently in view
    if (settings.excludePinned && tab.pinned) continue;
    if (settings.excludeAudible && tab.audible) continue;
    if (globalThis.TC.isProtectedUrl(tab.url)) continue;
    if (globalThis.TC.matchesWhitelist(tab.url, settings.whitelist)) continue;

    const lastAccessed = typeof tab.lastAccessed === "number" ? tab.lastAccessed : now;
    if (now - lastAccessed < thresholdMs) continue;

    if (settings.mode === "archive") {
      await archiveTab(tab);
    }
    try {
      await browser.tabs.remove(tab.id);
      swept.push({ id: tab.id, title: tab.title, url: tab.url });
    } catch {
      // tab may have already closed; ignore
    }
  }

  await setBadge(swept.length);
  return { swept, disabled: false };
}

async function restoreArchivedTab(archiveId) {
  const archive = await getArchive();
  const entry = archive.find((item) => item.archiveId === archiveId);
  if (!entry) return { ok: false };
  await browser.tabs.create({ url: entry.url, active: true });
  await browser.storage.local.set({
    archivedTabs: archive.filter((item) => item.archiveId !== archiveId),
  });
  return { ok: true };
}

async function deleteArchivedTab(archiveId) {
  const archive = await getArchive();
  await browser.storage.local.set({
    archivedTabs: archive.filter((item) => item.archiveId !== archiveId),
  });
  return { ok: true };
}

browser.runtime.onInstalled.addListener(async () => {
  const { settings } = await browser.storage.local.get("settings");
  if (!settings) {
    await browser.storage.local.set({ settings: globalThis.TC.DEFAULT_SETTINGS });
  }
  const { archivedTabs } = await browser.storage.local.get("archivedTabs");
  if (!archivedTabs) {
    await browser.storage.local.set({ archivedTabs: [] });
  }
  ensureAlarm();
});

browser.runtime.onStartup.addListener(ensureAlarm);
ensureAlarm();

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) sweep();
});

browser.runtime.onMessage.addListener((message) => {
  if (!message || !message.type) return false;

  if (message.type === "sweepNow") {
    return sweep();
  }
  if (message.type === "restoreArchivedTab") {
    return restoreArchivedTab(message.archiveId);
  }
  if (message.type === "deleteArchivedTab") {
    return deleteArchivedTab(message.archiveId);
  }
  if (message.type === "clearArchive") {
    return browser.storage.local.set({ archivedTabs: [] }).then(() => ({ ok: true }));
  }
  return false;
});
