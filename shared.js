// Shared helpers for Tab Cleaner.
// Loaded via <script src="shared.js"> in the popup and importScripts() in the
// service worker, so it must stay dependency-free and attach to globalThis.

globalThis.TC = {
  DEFAULT_SETTINGS: {
    enabled: true,
    thresholdHours: 4,
    mode: "archive", // "archive" | "close"
    excludePinned: true,
    excludeAudible: true,
    whitelist: [], // array of hostname fragments, e.g. "docs.google.com"
    theme: "system", // "system" | "light" | "dark"
  },

  MAX_ARCHIVE_ENTRIES: 300,

  // Tabs we should never touch, regardless of settings.
  isProtectedUrl(url) {
    if (!url) return true;
    return /^(chrome|edge|about|chrome-extension|devtools|chrome-untrusted|opera|vivaldi):/i.test(
      url
    );
  },

  hostnameOf(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    } catch {
      return "";
    }
  },

  matchesWhitelist(url, whitelist) {
    if (!whitelist || !whitelist.length) return false;
    const host = this.hostnameOf(url);
    if (!host) return false;
    return whitelist.some((entry) => {
      const needle = String(entry).trim().toLowerCase().replace(/^www\./, "");
      return needle && host.includes(needle);
    });
  },

  parseWhitelist(text) {
    return String(text || "")
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  },

  clampHours(value) {
    const n = Number(value);
    if (Number.isNaN(n)) return this.DEFAULT_SETTINGS.thresholdHours;
    return Math.min(336, Math.max(0.5, Math.round(n * 2) / 2));
  },

  formatIdle(ms) {
    if (!Number.isFinite(ms) || ms < 0) ms = 0;
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m idle`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hours < 24) return remMins ? `${hours}h ${remMins}m idle` : `${hours}h idle`;
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return remHours ? `${days}d ${remHours}h idle` : `${days}d idle`;
  },

  formatWhen(ts) {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  },
};
