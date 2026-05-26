const STORAGE_KEY = "edge-start-page-customizations-v1";
const EDITOR_SESSION_KEY = "edge-start-page-editor-password";
const SNAPSHOT_DB_NAME = "edge-start-page-db";
const SNAPSHOT_STORE_NAME = "snapshots";
const SNAPSHOT_KEY = "latest";
const STATUS_BATCH_SIZE = 10;
const STATUS_CONCURRENCY = 2;
const ICONS = {
  preview:
    '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  trash:
    '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M9 4h6l1 2H8l1-2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M7 7l1 12h8l1-12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 11v5M14 11v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
};
const AI_QUICK_LINKS = [
  { title: "ChatGPT", url: "https://chatgpt.com", domain: "chatgpt.com" },
  { title: "Claude", url: "https://claude.ai", domain: "claude.ai" },
  { title: "Gemini", url: "https://gemini.google.com", domain: "gemini.google.com" },
  { title: "Perplexity", url: "https://www.perplexity.ai", domain: "perplexity.ai" },
  { title: "Hugging Face", url: "https://huggingface.co", domain: "huggingface.co" },
  { title: "OpenRouter", url: "https://openrouter.ai", domain: "openrouter.ai" },
];

const sampleData = {
  source: "sample",
  profilePath: "示例数据",
  folders: [
    {
      name: "灵感与设计",
      path: ["收藏夹栏", "灵感与设计"],
      bookmarks: [
        { title: "Dribbble", url: "https://dribbble.com", domain: "dribbble.com" },
        { title: "Behance", url: "https://www.behance.net", domain: "behance.net" },
        { title: "Awwwards", url: "https://www.awwwards.com", domain: "awwwards.com" }
      ],
      childFolderCount: 0,
      isEmpty: false
    },
    {
      name: "开发工具",
      path: ["收藏夹栏", "开发工具"],
      bookmarks: [
        { title: "GitHub", url: "https://github.com", domain: "github.com" },
        {
          title: "MDN Web Docs",
          url: "https://developer.mozilla.org",
          domain: "developer.mozilla.org"
        },
        {
          title: "Stack Overflow",
          url: "https://stackoverflow.com",
          domain: "stackoverflow.com"
        }
      ],
      childFolderCount: 0,
      isEmpty: false
    },
    {
      name: "日常效率",
      path: ["收藏夹栏", "日常效率"],
      bookmarks: [
        { title: "Notion", url: "https://www.notion.so", domain: "notion.so" },
        { title: "Figma", url: "https://www.figma.com", domain: "figma.com" },
        { title: "Google Drive", url: "https://drive.google.com", domain: "drive.google.com" }
      ],
      childFolderCount: 0,
      isEmpty: false
    }
  ]
};

const state = {
  rawFolders: [],
  folders: [],
  query: "",
  source: "sample",
  profilePath: "示例数据",
  navOpen: new Set(),
  customizations: loadCustomizations(),
  statusMap: new Map(),
  statusQueueToken: 0,
  editingKey: "",
  editorPassword: sessionStorage.getItem(EDITOR_SESSION_KEY) || "",
  passwordDialogMode: "session",
};

let persistTimer = 0;

const elements = {
  editorAccess: document.querySelector("#editor-access"),
  editorPasswordAccess: document.querySelector("#editor-password-access"),
  autoImport: document.querySelector("#auto-import"),
  exportBookmarks: document.querySelector("#export-bookmarks"),
  fileInput: document.querySelector("#bookmark-file"),
  searchInput: document.querySelector("#search-input"),
  folderNav: document.querySelector("#folder-nav"),
  bookmarkRoot: document.querySelector("#bookmark-root"),
  folderCount: document.querySelector("#folder-count"),
  bookmarkCount: document.querySelector("#bookmark-count"),
  statusText: document.querySelector("#status-text"),
  navCount: document.querySelector("#nav-count"),
  resultSummary: document.querySelector("#result-summary"),
  spotlightCount: document.querySelector("#spotlight-count"),
  spotlightList: document.querySelector("#spotlight-list"),
  floatCount: document.querySelector("#float-count"),
  floatRibbon: document.querySelector("#float-ribbon"),
  networkScore: document.querySelector("#network-score"),
  networkCurve: document.querySelector("#network-curve"),
  networkOnline: document.querySelector("#network-online"),
  networkWarning: document.querySelector("#network-warning"),
  networkOffline: document.querySelector("#network-offline"),
  topDomain: document.querySelector("#top-domain"),
  largestFolder: document.querySelector("#largest-folder"),
  sourceLabel: document.querySelector("#source-label"),
  overviewLabel: document.querySelector("#overview-label"),
  autoPath: document.querySelector("#auto-path"),
  heroTags: document.querySelector("#hero-tags"),
  folderSelect: document.querySelector("#folder-select"),
  bookmarkForm: document.querySelector("#bookmark-form"),
  bookmarkTitle: document.querySelector("#bookmark-title"),
  bookmarkUrlInput: document.querySelector("#bookmark-url-input"),
  sizeToggle: document.querySelector("#size-toggle"),
  folderTemplate: document.querySelector("#folder-template"),
  bookmarkTemplate: document.querySelector("#bookmark-template"),
  editorAuthDialog: document.querySelector("#editor-auth-dialog"),
  editorAuthForm: document.querySelector("#editor-auth-form"),
  editorAuthPassword: document.querySelector("#editor-auth-password"),
  editorAuthMessage: document.querySelector("#editor-auth-message"),
  editorAuthCancel: document.querySelector("#editor-auth-cancel"),
  editorAuthCancelTop: document.querySelector("#editor-auth-cancel-top"),
  editorResetTrigger: document.querySelector("#editor-reset-trigger"),
  editorPasswordDialog: document.querySelector("#editor-password-dialog"),
  editorPasswordForm: document.querySelector("#editor-password-form"),
  editorPasswordTitle: document.querySelector("#editor-password-title"),
  editorPasswordNote: document.querySelector("#editor-password-note"),
  editorPasswordRecoveryRow: document.querySelector("#editor-password-recovery-row"),
  editorPasswordRecovery: document.querySelector("#editor-password-recovery"),
  editorPasswordNext: document.querySelector("#editor-password-next"),
  editorPasswordConfirm: document.querySelector("#editor-password-confirm"),
  editorPasswordMessage: document.querySelector("#editor-password-message"),
  editorPasswordCancel: document.querySelector("#editor-password-cancel"),
  editorPasswordCancelTop: document.querySelector("#editor-password-cancel-top"),
  editorDialog: document.querySelector("#bookmark-editor"),
  editorForm: document.querySelector("#bookmark-editor-form"),
  editorTitle: document.querySelector("#editor-title"),
  editorBookmarkTitle: document.querySelector("#editor-bookmark-title"),
  editorBookmarkUrl: document.querySelector("#editor-bookmark-url"),
  editorFolderSelect: document.querySelector("#editor-folder-select"),
  editorCancel: document.querySelector("#editor-cancel"),
  editorCancelTop: document.querySelector("#editor-cancel-top"),
};

function loadCustomizations() {
  const fallback = {
    removedKeys: [],
    removedFolderKeys: [],
    addedBookmarks: [],
    cardSize: "comfortable",
    editedBookmarks: {},
    pinnedKeys: [],
    visitCounts: {},
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);
    return {
      removedKeys: Array.isArray(parsed.removedKeys) ? parsed.removedKeys : [],
      removedFolderKeys: Array.isArray(parsed.removedFolderKeys) ? parsed.removedFolderKeys : [],
      addedBookmarks: Array.isArray(parsed.addedBookmarks) ? parsed.addedBookmarks : [],
      cardSize: parsed.cardSize === "compact" ? "compact" : "comfortable",
      editedBookmarks:
        parsed.editedBookmarks && typeof parsed.editedBookmarks === "object"
          ? parsed.editedBookmarks
          : {},
      pinnedKeys: Array.isArray(parsed.pinnedKeys) ? parsed.pinnedKeys : [],
      visitCounts:
        parsed.visitCounts && typeof parsed.visitCounts === "object" ? parsed.visitCounts : {},
    };
  } catch {
    return fallback;
  }
}

function openSnapshotDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }

    const request = indexedDB.open(SNAPSHOT_DB_NAME, 1);
    request.addEventListener("upgradeneeded", () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(SNAPSHOT_STORE_NAME)) {
        database.createObjectStore(SNAPSHOT_STORE_NAME);
      }
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

function runSnapshotRequest(request) {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

async function readPersistedSnapshot() {
  const database = await openSnapshotDb();
  if (!database) {
    return null;
  }

  try {
    const transaction = database.transaction(SNAPSHOT_STORE_NAME, "readonly");
    const result = await runSnapshotRequest(transaction.objectStore(SNAPSHOT_STORE_NAME).get(SNAPSHOT_KEY));
    return result && Array.isArray(result.rawFolders || result.folders) ? result : null;
  } finally {
    database.close();
  }
}

async function writePersistedSnapshot(payload) {
  if (!payload || payload.source === "sample") {
    return;
  }

  const database = await openSnapshotDb();
  if (!database) {
    return;
  }

  try {
    const transaction = database.transaction(SNAPSHOT_STORE_NAME, "readwrite");
    const record = {
      source: payload.source || "manual",
      profilePath: payload.profilePath || "未知来源",
      rawFolders: Array.isArray(payload.rawFolders) ? payload.rawFolders : payload.folders || [],
      customizations: payload.customizations && typeof payload.customizations === "object" ? payload.customizations : {},
      savedAt: Date.now(),
    };
    await runSnapshotRequest(transaction.objectStore(SNAPSHOT_STORE_NAME).put(record, SNAPSHOT_KEY));
  } finally {
    database.close();
  }
}

function isFolderRemoved(pathKey, removedFolderSet) {
  return [...removedFolderSet].some(
    (removedKey) => pathKey === removedKey || pathKey.startsWith(`${removedKey} / `)
  );
}

function saveCustomizations() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.customizations));
  if (isEditorUnlocked()) {
    schedulePersistCurrentState();
  }
}

function createSnapshotPayload() {
  return {
    source: state.source,
    profilePath: state.profilePath,
    rawFolders: state.rawFolders,
    customizations: state.customizations,
  };
}

function getRemoteSnapshotEndpoint() {
  return isLocalApiAvailable() ? "/api/bookmark-state" : "/.netlify/functions/bookmark-state";
}

async function fetchRemoteSnapshot() {
  const response = await fetch(getRemoteSnapshotEndpoint(), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error("读取云端书签状态失败。");
  }

  return response.json();
}

async function saveRemoteSnapshot(snapshot) {
  if (!snapshot || snapshot.source === "sample") {
    return;
  }

  const response = await fetch(getRemoteSnapshotEndpoint(), {
    method: "POST",
    headers: getAuthorizedHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(snapshot),
  });

  if (response.status === 401 || response.status === 403) {
    lockEditorMode();
    throw new Error("编辑口令已失效，请重新解锁。");
  }
  if (!response.ok) {
    throw new Error("保存云端书签状态失败。");
  }
}

function applyCustomizationsState(nextCustomizations) {
  state.customizations =
    nextCustomizations && typeof nextCustomizations === "object"
      ? {
          removedKeys: Array.isArray(nextCustomizations.removedKeys) ? nextCustomizations.removedKeys : [],
          removedFolderKeys: Array.isArray(nextCustomizations.removedFolderKeys)
            ? nextCustomizations.removedFolderKeys
            : [],
          addedBookmarks: Array.isArray(nextCustomizations.addedBookmarks)
            ? nextCustomizations.addedBookmarks
            : [],
          cardSize: nextCustomizations.cardSize === "compact" ? "compact" : "comfortable",
          editedBookmarks:
            nextCustomizations.editedBookmarks && typeof nextCustomizations.editedBookmarks === "object"
              ? nextCustomizations.editedBookmarks
              : {},
          pinnedKeys: Array.isArray(nextCustomizations.pinnedKeys) ? nextCustomizations.pinnedKeys : [],
          visitCounts:
            nextCustomizations.visitCounts && typeof nextCustomizations.visitCounts === "object"
              ? nextCustomizations.visitCounts
              : {},
        }
      : loadCustomizations();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.customizations));
}

async function persistCurrentState() {
  const snapshot = createSnapshotPayload();
  await writePersistedSnapshot(snapshot).catch(() => null);
  await saveRemoteSnapshot(snapshot).catch(() => null);
}

function schedulePersistCurrentState() {
  window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    void persistCurrentState();
  }, 180);
}

function isEditorUnlocked() {
  return Boolean(state.editorPassword);
}

function updateEditorModeUi() {
  document.body.dataset.editorMode = isEditorUnlocked() ? "unlocked" : "locked";
  elements.editorAccess.textContent = isEditorUnlocked() ? "退出编辑" : "编辑模式";
  elements.editorPasswordAccess.hidden = !isEditorUnlocked();
}

function lockEditorMode() {
  state.editorPassword = "";
  sessionStorage.removeItem(EDITOR_SESSION_KEY);
  updateEditorModeUi();
}

function unlockEditorMode(password) {
  state.editorPassword = password;
  sessionStorage.setItem(EDITOR_SESSION_KEY, password);
  updateEditorModeUi();
}

function getAuthorizedHeaders(baseHeaders = {}) {
  return isEditorUnlocked()
    ? {
        ...baseHeaders,
        "X-Editor-Password": state.editorPassword,
      }
    : baseHeaders;
}

function getEditorAuthEndpoint() {
  return isLocalApiAvailable() ? "/api/editor-auth" : "/.netlify/functions/editor-auth";
}

function getEditorPasswordEndpoint() {
  return isLocalApiAvailable() ? "/api/editor-password" : "/.netlify/functions/editor-password";
}

async function verifyEditorPassword(password) {
  const response = await fetch(getEditorAuthEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "口令不正确。");
  }

  return payload;
}

async function changeEditorPassword({ nextPassword, recoveryPassword = "" }) {
  const useRecovery = Boolean(recoveryPassword);
  const response = await fetch(getEditorPasswordEndpoint(), {
    method: "POST",
    headers: useRecovery
      ? { "Content-Type": "application/json" }
      : getAuthorizedHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      nextPassword,
      recoveryPassword,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403) {
    if (!useRecovery) {
      lockEditorMode();
    }
    throw new Error(payload.error || "修改口令失败。");
  }
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "修改口令失败。");
  }

  return payload;
}

function promptEditorUnlock(message = "本次会话只需输入一次，之后可以连续编辑。") {
  elements.editorAuthMessage.textContent = message;
  elements.editorAuthPassword.value = "";
  elements.editorAuthDialog.showModal();
  queueMicrotask(() => elements.editorAuthPassword.focus());
}

function openPasswordDialog(mode = "session") {
  state.passwordDialogMode = mode;
  elements.editorPasswordDialog.dataset.mode = mode;
  elements.editorPasswordTitle.textContent = mode === "recovery" ? "使用安全密码重设口令" : "修改编辑口令";
  elements.editorPasswordNote.textContent =
    mode === "recovery"
      ? "如果忘记编辑口令，可以输入安全密码后重设一个新的口令。"
      : "当前会话已经解锁，保存后会立即切换到新口令。";
  elements.editorPasswordMessage.textContent = "建议使用你自己容易记住、但别人难猜到的新口令。";
  elements.editorPasswordRecovery.value = "";
  elements.editorPasswordNext.value = "";
  elements.editorPasswordConfirm.value = "";
  elements.editorPasswordDialog.showModal();
  queueMicrotask(() => {
    const target = mode === "recovery" ? elements.editorPasswordRecovery : elements.editorPasswordNext;
    target.focus();
  });
}

function closePasswordDialog() {
  elements.editorPasswordDialog.close();
}

function ensureEditorAccess(message) {
  if (isEditorUnlocked()) {
    return true;
  }

  promptEditorUnlock(message || "请先输入编辑口令，再进行书签修改。");
  return false;
}

function isLocalApiAvailable() {
  const host = window.location.hostname;
  return (
    window.location.protocol.startsWith("http") &&
    (host === "127.0.0.1" || host === "localhost" || host === "::1")
  );
}

function switchToStaticMode(statusLabel = "云端静态版") {
  elements.autoImport.disabled = true;
  elements.autoImport.textContent = "云端请手动导入";
  elements.statusText.textContent = statusLabel;
  elements.autoPath.textContent =
    state.source === "sample"
      ? "Cloudflare 静态版本无法读取本机 Edge 文件，请使用“手动导入文件”。"
      : `当前来源：${state.profilePath} · 当前浏览器会自动保留你的书签调整`;
}

function applyCardSize() {
  document.documentElement.dataset.cardSize = state.customizations.cardSize || "comfortable";
  elements.sizeToggle.textContent =
    state.customizations.cardSize === "compact" ? "切换标准卡片" : "切换紧凑卡片";
}

function slugify(text) {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
      .replace(/^-+|-+$/g, "") || "folder"
  );
}

function pathToKey(path) {
  return path.join(" / ");
}

function getHostname(rawUrl) {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "");
  } catch {
    return rawUrl;
  }
}

function normalizeUrl(rawUrl) {
  const value = rawUrl.trim();
  if (!value) {
    return value;
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return `https://${value}`;
}

function sanitizeText(value, fallback = "") {
  return String(value || fallback)
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getBookmarkKey(folderPath, bookmark) {
  return `${pathToKey(folderPath)}::${bookmark.title}::${bookmark.url}`;
}

function getIconLabel(title, url) {
  const text = sanitizeText(title, getHostname(url));
  return text.slice(0, 1).toUpperCase();
}

function rankBookmark(bookmark, folderName) {
  let score = 0;
  const text = `${bookmark.title} ${bookmark.url} ${folderName}`.toLowerCase();
  if (/github|figma|notion|drive|mail|youtube|chatgpt|openai|claude|gemini/.test(text)) {
    score += 3;
  }
  if (/tool|dev|design|效率|开发|工作|常用|daily|aigc|ai/.test(text)) {
    score += 2;
  }
  if (bookmark.title.length <= 18) {
    score += 1;
  }
  return score;
}

function normalizeFolder(folder) {
  const path = Array.isArray(folder.path) ? folder.path : [folder.name || "未命名分组"];
  const bookmarks = Array.isArray(folder.bookmarks) ? folder.bookmarks : [];
  const normalizedBookmarks = bookmarks.map((bookmark) => ({
    title: sanitizeText(bookmark.title, bookmark.url),
    url: bookmark.url,
    domain: bookmark.domain || getHostname(bookmark.url),
    isCustom: Boolean(bookmark.isCustom),
    key: bookmark.key || getBookmarkKey(path, bookmark),
  }));

  return {
    name: sanitizeText(folder.name, path[path.length - 1] || "未命名分组"),
    path,
    childFolderCount: Number(folder.childFolderCount || 0),
    isEmpty: Boolean(folder.isEmpty),
    bookmarks: normalizedBookmarks,
  };
}

function parseBookmarkJson(raw) {
  const data = JSON.parse(raw);
  const roots = data?.roots;
  if (!roots || typeof roots !== "object") {
    throw new Error("没有找到 Edge 书签 JSON 结构。");
  }

  const folders = [];
  const walkNode = (node, trail = []) => {
    if (!node) {
      return;
    }

    const nodeName = sanitizeText(node.name, "未命名分组");
    const currentTrail = [...trail, nodeName];

    if (node.type === "folder") {
      const childFolders = (node.children || []).filter((child) => child.type === "folder");
      const bookmarks = Array.isArray(node.children)
        ? node.children
            .filter((child) => child.type === "url" && child.url)
            .map((child) => ({
              title: sanitizeText(child.name, child.url),
              url: child.url,
              domain: getHostname(child.url),
            }))
        : [];

      folders.push({
        name: nodeName,
        path: currentTrail,
        bookmarks,
        childFolderCount: childFolders.length,
        isEmpty: bookmarks.length === 0 && childFolders.length === 0,
      });

      childFolders.forEach((child) => walkNode(child, currentTrail));
    }
  };

  Object.values(roots).forEach((rootNode) => walkNode(rootNode));
  return folders.map(normalizeFolder);
}

function flattenTree(node, trail = [], collector = []) {
  if (!node) {
    return collector;
  }

  const currentTrail = node.name ? [...trail, node.name] : [...trail];
  const children = Array.isArray(node.children) ? node.children : [];
  const bookmarks = Array.isArray(node.bookmarks)
    ? node.bookmarks.map((bookmark) => ({
        title: sanitizeText(bookmark.title, bookmark.url),
        url: bookmark.url,
        domain: bookmark.domain || getHostname(bookmark.url),
      }))
    : [];

  collector.push(
    normalizeFolder({
      name: sanitizeText(node.name, "未命名分组"),
      path: currentTrail,
      childFolderCount: children.length,
      isEmpty: bookmarks.length === 0 && children.length === 0,
      bookmarks,
    })
  );

  children.forEach((child) => flattenTree(child, currentTrail, collector));
  return collector;
}

function parseBookmarkDocument(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const rootDl = doc.querySelector("dl");
  if (!rootDl) {
    throw new Error("没有找到书签结构，请确认导入的是 Edge 导出的 HTML 文件。");
  }

  const walkDl = (dl, fallbackName = "收藏夹栏") => {
    const folder = { name: fallbackName, children: [], bookmarks: [] };
    let currentFolderName = null;

    Array.from(dl.children).forEach((child) => {
      const tag = child.tagName?.toLowerCase();
      if (tag === "dt") {
        const heading = child.querySelector("h3");
        const anchor = child.querySelector("a");
        if (heading) {
          currentFolderName = sanitizeText(heading.textContent, "未命名分组");
        } else if (anchor) {
          const href = anchor.getAttribute("href");
          if (href) {
            folder.bookmarks.push({
              title: sanitizeText(anchor.textContent, href),
              url: href,
              domain: getHostname(href),
            });
          }
        }
      }

      if (tag === "dl") {
        folder.children.push(walkDl(child, currentFolderName || "未命名分组"));
        currentFolderName = null;
      }
    });

    return folder;
  };

  return flattenTree(walkDl(rootDl));
}

function parseBookmarks(text, fileName = "") {
  const trimmed = text.trim();
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".json") || trimmed.startsWith("{")) {
    return parseBookmarkJson(text);
  }
  return parseBookmarkDocument(text);
}

function getEditedBookmark(bookmark) {
  const override = state.customizations.editedBookmarks[bookmark.key];
  if (!override) {
    return bookmark;
  }

  const nextUrl = override.url ? normalizeUrl(override.url) : bookmark.url;
  return {
    ...bookmark,
    title: sanitizeText(override.title, bookmark.title),
    url: nextUrl,
    domain: getHostname(nextUrl),
  };
}

function sortBookmarks(bookmarks) {
  const pinned = new Set(state.customizations.pinnedKeys);
  const visitCounts = state.customizations.visitCounts || {};

  return bookmarks
    .map((bookmark, index) => ({ bookmark, index }))
    .sort((left, right) => {
      const leftPinned = pinned.has(left.bookmark.key) ? 1 : 0;
      const rightPinned = pinned.has(right.bookmark.key) ? 1 : 0;
      if (leftPinned !== rightPinned) {
        return rightPinned - leftPinned;
      }

      const leftVisits = Number(visitCounts[left.bookmark.key] || 0);
      const rightVisits = Number(visitCounts[right.bookmark.key] || 0);
      if (leftVisits !== rightVisits) {
        return rightVisits - leftVisits;
      }

      return left.index - right.index;
    })
    .map((item) => item.bookmark);
}

function applyCustomizations(rawFolders) {
  const removedKeys = new Set(state.customizations.removedKeys);
  const removedFolderSet = new Set(state.customizations.removedFolderKeys || []);
  const folders = rawFolders
    .map((folder) => normalizeFolder(folder))
    .filter((folder) => !isFolderRemoved(pathToKey(folder.path), removedFolderSet));
  const folderMap = new Map(folders.map((folder) => [pathToKey(folder.path), folder]));

  folders.forEach((folder) => {
    folder.bookmarks = sortBookmarks(
      folder.bookmarks
        .filter((bookmark) => !removedKeys.has(bookmark.key))
        .map((bookmark) => getEditedBookmark(bookmark))
    );
    folder.isEmpty = folder.bookmarks.length === 0 && folder.childFolderCount === 0;
  });

  state.customizations.addedBookmarks.forEach((bookmark) => {
    const pathKey = pathToKey(bookmark.path);
    if (isFolderRemoved(pathKey, removedFolderSet)) {
      return;
    }
    let folder = folderMap.get(pathKey);
    if (!folder) {
      folder = normalizeFolder({
        name: bookmark.path[bookmark.path.length - 1] || "自定义分组",
        path: bookmark.path,
        childFolderCount: 0,
        isEmpty: false,
        bookmarks: [],
      });
      folders.push(folder);
      folderMap.set(pathKey, folder);
    }

    if (!folder.bookmarks.find((item) => item.key === bookmark.key)) {
      folder.bookmarks.push(
        getEditedBookmark({
          title: bookmark.title,
          url: bookmark.url,
          domain: bookmark.domain || getHostname(bookmark.url),
          isCustom: true,
          key: bookmark.key,
        })
      );
      folder.bookmarks = sortBookmarks(folder.bookmarks);
      folder.isEmpty = false;
    }
  });

  return folders;
}

function setFolders(rawFolders) {
  state.rawFolders = rawFolders.map(normalizeFolder);
  state.folders = applyCustomizations(state.rawFolders);
}

function getAllBookmarks(folders) {
  return folders.flatMap((folder) =>
    folder.bookmarks.map((bookmark) => ({
      ...bookmark,
      folderName: folder.name,
      path: folder.path,
      rank: rankBookmark(bookmark, folder.name),
      visits: Number(state.customizations.visitCounts[bookmark.key] || 0),
      pinned: state.customizations.pinnedKeys.includes(bookmark.key),
    }))
  );
}

function getDomainStats(bookmarks) {
  const domainMap = new Map();
  bookmarks.forEach((bookmark) => {
    const domain = bookmark.domain || getHostname(bookmark.url);
    domainMap.set(domain, (domainMap.get(domain) || 0) + 1);
  });
  return [...domainMap.entries()].sort((left, right) => right[1] - left[1]);
}

function updateStats(folders) {
  const allBookmarks = getAllBookmarks(folders);
  const largest = [...folders].sort((left, right) => right.bookmarks.length - left.bookmarks.length)[0];
  const topDomain = getDomainStats(allBookmarks)[0];

  elements.folderCount.textContent = String(folders.length);
  elements.bookmarkCount.textContent = String(allBookmarks.length);
  elements.navCount.textContent = String(folders.length);
  elements.topDomain.textContent = topDomain ? `${topDomain[0]} · ${topDomain[1]}` : "-";
  elements.largestFolder.textContent = largest ? `${largest.name} · ${largest.bookmarks.length}` : "-";
  elements.sourceLabel.textContent =
    state.source === "auto" ? "Edge 自动导入" : state.source === "manual" ? "手动导入" : "示例数据";
  elements.overviewLabel.textContent = allBookmarks.length ? "已生成" : "未加载";
}

function renderHeroTags(folders) {
  const allBookmarks = getAllBookmarks(folders);
  const domains = getDomainStats(allBookmarks).slice(0, 5);
  elements.heroTags.innerHTML = "";
  const fragment = document.createDocumentFragment();

  domains.forEach(([domain, count]) => {
    const tag = document.createElement("span");
    tag.textContent = `${domain} · ${count}`;
    fragment.append(tag);
  });

  elements.heroTags.append(fragment);
}

function createQuickLink(link, className = "quick-link-item", meta = "") {
  const anchor = document.createElement("a");
  anchor.className = className;
  anchor.href = link.url;
  anchor.target = "_blank";
  anchor.rel = "noreferrer noopener";
  anchor.innerHTML = `
    <div class="quick-link-icon">
      <img alt="" loading="lazy" />
      <span>${escapeHtml(getIconLabel(link.title, link.url))}</span>
    </div>
    <div class="quick-link-copy">
      <strong>${escapeHtml(link.title)}</strong>
      <span>${escapeHtml(meta || link.domain || getHostname(link.url))}</span>
    </div>
  `;

  const image = anchor.querySelector("img");
  const fallback = anchor.querySelector(".quick-link-icon span");
  const sources = inferFaviconSources(link);
  let sourceIndex = 0;

  const tryNext = () => {
    if (sourceIndex >= sources.length) {
      image.hidden = true;
      fallback.hidden = false;
      return;
    }
    image.src = sources[sourceIndex];
    sourceIndex += 1;
  };

  image.hidden = true;
  image.addEventListener("load", () => {
    image.hidden = false;
    fallback.hidden = true;
  });
  image.addEventListener("error", tryNext);
  tryNext();
  return anchor;
}

function renderSpotlight(folders) {
  const allBookmarks = getAllBookmarks(folders);
  const frequent = [...allBookmarks]
    .sort((left, right) => {
      const visitDiff = right.visits - left.visits;
      if (visitDiff !== 0) {
        return visitDiff;
      }
      const pinDiff = Number(right.pinned) - Number(left.pinned);
      if (pinDiff !== 0) {
        return pinDiff;
      }
      return right.rank - left.rank;
    })
    .slice(0, 6);

  elements.spotlightCount.textContent = String(frequent.length + AI_QUICK_LINKS.length);
  elements.spotlightList.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "spotlight-stack";

  const frequentSection = document.createElement("section");
  frequentSection.className = "spotlight-group";
  frequentSection.innerHTML =
    '<div class="spotlight-heading"><h3>经常访问</h3><span>点击卡片会自动累计</span></div>';
  const frequentGrid = document.createElement("div");
  frequentGrid.className = "quick-link-grid";

  const frequentSource = frequent.length
    ? frequent
    : [...allBookmarks].sort((left, right) => right.rank - left.rank).slice(0, 6);

  if (frequentSource.length) {
    frequentSource.forEach((bookmark) => {
      frequentGrid.append(createQuickLink(bookmark, "quick-link-item", bookmark.folderName));
    });
  } else {
    const note = document.createElement("p");
    note.className = "empty-note";
    note.textContent = "导入完成后，这里会显示你的常用站点。";
    frequentGrid.append(note);
  }
  frequentSection.append(frequentGrid);

  const aiSection = document.createElement("section");
  aiSection.className = "spotlight-group";
  aiSection.innerHTML = '<div class="spotlight-heading"><h3>AI 快速入口</h3><span>主流工具一键直达</span></div>';
  const aiGrid = document.createElement("div");
  aiGrid.className = "quick-link-grid quick-link-grid-ai";
  AI_QUICK_LINKS.forEach((link) => {
    aiGrid.append(createQuickLink(link, "quick-link-item quick-link-item-ai", link.domain));
  });
  aiSection.append(aiGrid);

  wrapper.append(frequentSection, aiSection);
  elements.spotlightList.append(wrapper);
}

function createFloatRibbonItem(bookmark, index) {
  const anchor = document.createElement("a");
  anchor.className = `float-ribbon-item tone-${(index % 6) + 1}`;
  anchor.href = bookmark.url;
  anchor.target = "_blank";
  anchor.rel = "noreferrer noopener";
  anchor.dataset.bookmarkKey = bookmark.key;
  anchor.style.setProperty("--float-offset", `${((index % 4) - 1.5) * 8}px`);
  anchor.style.setProperty("--float-rotate", `${((index % 5) - 2) * 2.4}deg`);
  anchor.innerHTML = `
    <span class="float-ribbon-dot"></span>
    <span class="float-ribbon-label">${escapeHtml(bookmark.title)}</span>
  `;
  return anchor;
}

function renderFloatRibbon(folders) {
  const allBookmarks = getAllBookmarks(folders);
  const frequent = [...allBookmarks]
    .sort((left, right) => {
      const visitDiff = right.visits - left.visits;
      if (visitDiff !== 0) {
        return visitDiff;
      }
      return right.rank - left.rank;
    })
    .slice(0, 10);

  elements.floatCount.textContent = String(frequent.length);
  elements.floatRibbon.innerHTML = "";

  if (!frequent.length) {
    const note = document.createElement("p");
    note.className = "empty-note";
    note.textContent = "多点几次常用网站，这里会生成彩色快捷浮动条。";
    elements.floatRibbon.append(note);
    return;
  }

  const shuffled = frequent
    .map((bookmark) => ({
      bookmark,
      weight: (bookmark.visits || 0) * 100 + bookmark.title.length,
    }))
    .sort((left, right) => right.weight - left.weight)
    .map((item, index, array) => array[(index * 3) % array.length].bookmark);

  const fragment = document.createDocumentFragment();
  shuffled.forEach((bookmark, index) => {
    fragment.append(createFloatRibbonItem(bookmark, index));
  });
  elements.floatRibbon.append(fragment);
}

function getNetworkStatusSummary() {
  const summary = { online: 0, warning: 0, offline: 0, pending: 0 };
  const urls = new Set(getAllBookmarks(state.folders).map((bookmark) => bookmark.url));

  urls.forEach((url) => {
    const status = state.statusMap.get(url);
    if (!status) {
      summary.pending += 1;
      return;
    }
    if (status.availability === "online") {
      summary.online += 1;
      return;
    }
    if (status.availability === "warning") {
      summary.warning += 1;
      return;
    }
    summary.offline += 1;
  });

  return summary;
}

function renderNetworkChart() {
  if (!elements.networkCurve) {
    return;
  }

  const summary = getNetworkStatusSummary();
  const total = summary.online + summary.warning + summary.offline + summary.pending;
  const checked = Math.max(1, summary.online + summary.warning + summary.offline);
  const score = Math.round((summary.online / checked) * 100);
  const risk = summary.warning * 0.5 + summary.offline;

  elements.networkOnline.textContent = String(summary.online);
  elements.networkWarning.textContent = String(summary.warning);
  elements.networkOffline.textContent = String(summary.offline);
  elements.networkScore.textContent = total ? `${score}% 稳定` : "等待检测";

  const points = [0.78, 0.64, 0.68, 0.48, 0.56, 0.38, 0.42, 0.28].map((base, index) => {
    const x = 8 + index * 32;
    const y = Math.min(82, Math.max(18, 12 + (base + risk / Math.max(10, total || 1)) * 72));
    return `${x} ${y}`;
  });

  elements.networkCurve.setAttribute("d", `M${points.join(" L")}`);
}

function populateFolderSelect(select, folders) {
  if (!select) {
    return;
  }
  select.innerHTML = "";
  const fragment = document.createDocumentFragment();

  folders.forEach((folder) => {
    const option = document.createElement("option");
    option.value = pathToKey(folder.path);
    option.textContent = folder.path.join(" / ");
    fragment.append(option);
  });

  select.append(fragment);
}

function renderFolderSelect(folders) {
  populateFolderSelect(elements.folderSelect, folders);
  populateFolderSelect(elements.editorFolderSelect, folders);
}

function renderNavigation(folders) {
  elements.folderNav.innerHTML = "";
  if (!folders.length) {
    elements.folderNav.innerHTML = '<p class="empty-note">没有可显示的分组。</p>';
    return;
  }

  const fragment = document.createDocumentFragment();
  folders.forEach((folder) => {
    const navItem = document.createElement("section");
    navItem.className = "folder-nav-item";
    navItem.dataset.folderPath = pathToKey(folder.path);
    const folderId = slugify(folder.path.join("-"));
    const countLabel =
      folder.bookmarks.length > 0
        ? `${folder.bookmarks.length} 个书签`
        : folder.childFolderCount > 0
          ? `${folder.childFolderCount} 个子文件夹`
          : "空文件夹";

    navItem.innerHTML = `
      <div class="folder-nav-header">
        <button class="folder-jump" type="button" data-target="${folderId}">
          <span>${escapeHtml(folder.name)}</span>
          <small>${escapeHtml(countLabel)}</small>
        </button>
        <div class="folder-nav-actions">
          <button
            class="folder-toggle icon-only-button"
            type="button"
            data-path="${escapeHtml(pathToKey(folder.path))}"
            aria-expanded="${String(state.navOpen.has(pathToKey(folder.path)))}"
            aria-label="预览分组"
            title="预览分组"
          >
            ${ICONS.preview}
          </button>
          <button
            class="folder-delete-button icon-only-button editor-only"
            type="button"
            data-folder-path="${escapeHtml(pathToKey(folder.path))}"
            title="删除分组"
            aria-label="删除分组"
          >
            ${ICONS.trash}
          </button>
        </div>
      </div>
      <div class="folder-preview ${state.navOpen.has(pathToKey(folder.path)) ? "is-open" : ""}"></div>
    `;

    const preview = navItem.querySelector(".folder-preview");
    if (folder.bookmarks.length > 0) {
      folder.bookmarks.slice(0, 4).forEach((bookmark) => {
        const previewRow = document.createElement("div");
        previewRow.className = "folder-preview-row";
        previewRow.innerHTML = `
          <a
            href="${escapeHtml(bookmark.url)}"
            target="_blank"
            rel="noreferrer noopener"
            class="folder-preview-link"
          >${escapeHtml(bookmark.title)}</a>
          <button
            type="button"
            class="folder-preview-delete icon-only-button editor-only"
            data-bookmark-key="${escapeHtml(bookmark.key)}"
            title="删除书签"
            aria-label="删除书签"
          >
            ${ICONS.trash}
          </button>
        `;
        preview.append(previewRow);
      });
    } else if (folder.childFolderCount > 0) {
      const note = document.createElement("p");
      note.className = "empty-note";
      note.textContent = "这个分组本身没有直属书签，可以继续查看下级分组。";
      preview.append(note);
    } else {
      const note = document.createElement("p");
      note.className = "empty-note";
      note.textContent = "这个分组目前是空的。";
      preview.append(note);
    }

    const canvasLink = document.createElement("button");
    canvasLink.type = "button";
    canvasLink.className = "folder-preview-jump";
    canvasLink.dataset.target = folderId;
    canvasLink.textContent = "在右侧画布查看";
    preview.append(canvasLink);
    fragment.append(navItem);
  });

  elements.folderNav.append(fragment);
}

function inferFaviconSources(bookmark) {
  try {
    const parsed = new URL(bookmark.url);
    return [
      `https://icons.duckduckgo.com/ip3/${bookmark.domain || parsed.hostname}.ico`,
      `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(parsed.origin)}`,
      `${parsed.origin}/favicon.ico`,
    ];
  } catch {
    return [];
  }
}

function getStatusMeta(status) {
  if (!status) {
    return {
      availabilityText: "检测中",
      availabilityClass: "is-pending",
      regionText: "地区待定",
      warningText: "",
    };
  }

  const regionText =
    status.region === "cn"
      ? "国内站点"
      : status.region === "overseas"
        ? "海外站点"
        : status.region === "local"
          ? "本地网络"
          : "地区未知";

  if (status.availability === "online") {
    return {
      availabilityText:
        status.statusCode && status.statusCode >= 400 ? `可达 ${status.statusCode}` : "可访问",
      availabilityClass: "is-online",
      regionText,
      warningText: "",
    };
  }

  if (status.availability === "warning") {
    return {
      availabilityText: "访问异常",
      availabilityClass: "is-warning",
      regionText,
      warningText: status.message || "站点返回异常，请人工确认。",
    };
  }

  return {
    availabilityText: "疑似失效",
    availabilityClass: "is-offline",
    regionText,
    warningText: status.message || "当前网络下访问失败，建议删除或替换。",
  };
}

function applyStatusToCard(card, bookmark) {
  const status = state.statusMap.get(bookmark.url);
  const meta = getStatusMeta(status);
  const availability = card.querySelector(".status-availability");
  const region = card.querySelector(".status-region");

  availability.textContent = meta.availabilityText;
  availability.className = `status-pill status-availability ${meta.availabilityClass}`;
  region.textContent = meta.regionText;

  card.classList.toggle("is-offline-card", meta.availabilityClass === "is-offline");
  card.classList.toggle("is-warning-card", meta.availabilityClass === "is-warning");

  let warning = card.querySelector(".bookmark-warning");
  if (meta.warningText) {
    if (!warning) {
      warning = document.createElement("p");
      warning.className = "bookmark-warning";
      card.querySelector(".bookmark-body").append(warning);
    }
    warning.textContent = meta.warningText;
  } else if (warning) {
    warning.remove();
  }
}

function createEmptyCard(folder) {
  const emptyCard = document.createElement("article");
  emptyCard.className = "bookmark-card bookmark-card-empty";
  emptyCard.innerHTML =
    folder.childFolderCount > 0
      ? `<div class="bookmark-body"><h4 class="bookmark-title">这个收藏夹下暂时没有直属书签</h4><p class="bookmark-url">它包含 ${folder.childFolderCount} 个子文件夹，请继续查看下级分组。</p></div>`
      : '<div class="bookmark-body"><h4 class="bookmark-title">空文件夹</h4><p class="bookmark-url">这个收藏夹目前没有书签内容。</p></div>';
  return emptyCard;
}

function filterFolders() {
  const query = state.query.trim().toLowerCase();
  return state.folders
    .map((folder) => ({
      ...folder,
      bookmarks: folder.bookmarks.filter((bookmark) => {
        if (!query) {
          return true;
        }
        const haystack = `${bookmark.title} ${bookmark.url} ${bookmark.domain}`.toLowerCase();
        return haystack.includes(query);
      }),
    }))
    .filter((folder) => {
      if (!query) {
        return true;
      }
      const folderHaystack = `${folder.name} ${folder.path.join(" ")}`.toLowerCase();
      return folder.bookmarks.length > 0 || folderHaystack.includes(query);
    });
}

function renderBookmarks() {
  const filteredFolders = filterFolders();

  renderNavigation(filteredFolders);
  renderFolderSelect(state.folders);
  elements.bookmarkRoot.innerHTML = "";

  if (!filteredFolders.length) {
    elements.resultSummary.textContent = state.query ? "没有匹配结果" : "等待内容";
    elements.bookmarkRoot.innerHTML = `
      <div class="empty-state">
        <div class="empty-orb"></div>
        <h3>${state.query ? "没有找到匹配书签" : "还没有可展示的书签"}</h3>
        <p>${state.query ? "换一个关键词试试，或者清空当前搜索。" : "点击自动导入，或者手动导入 Edge 书签文件。"}</p>
      </div>
    `;
    return;
  }

  const shownBookmarks = filteredFolders.reduce((sum, folder) => sum + folder.bookmarks.length, 0);
  const emptyFolders = filteredFolders.filter((folder) => folder.bookmarks.length === 0).length;
  elements.resultSummary.textContent = `显示 ${shownBookmarks} 个书签 / ${filteredFolders.length} 个分组`;
  if (emptyFolders > 0) {
    elements.resultSummary.textContent += ` / ${emptyFolders} 个空或容器分组`;
  }

  const fragment = document.createDocumentFragment();
  const urlsToCheck = [];

  filteredFolders.forEach((folder) => {
    const section = elements.folderTemplate.content.firstElementChild.cloneNode(true);
    const folderId = slugify(folder.path.join("-"));
    section.id = folderId;
    section.querySelector(".folder-path").textContent = folder.path.join(" / ");
    section.querySelector(".folder-title").textContent = folder.name;
    section.querySelector(".folder-size").textContent =
      folder.bookmarks.length > 0
        ? `${folder.bookmarks.length} 项`
        : folder.childFolderCount > 0
          ? `${folder.childFolderCount} 个子文件夹`
          : "空文件夹";

    const grid = section.querySelector(".bookmark-grid");
    if (!folder.bookmarks.length) {
      grid.append(createEmptyCard(folder));
    } else {
      folder.bookmarks.forEach((bookmark, index) => {
        const card = elements.bookmarkTemplate.content.firstElementChild.cloneNode(true);
        card.dataset.urlKey = bookmark.url;
        card.dataset.bookmarkKey = bookmark.key;
        card.draggable = isEditorUnlocked();

        const favicon = card.querySelector(".bookmark-favicon");
        const fallback = card.querySelector(".bookmark-fallback");
        fallback.textContent = getIconLabel(bookmark.title, bookmark.url);
        favicon.hidden = true;

        const sources = inferFaviconSources(bookmark);
        let sourceIndex = 0;
        const tryNextSource = () => {
          if (sourceIndex >= sources.length) {
            favicon.hidden = true;
            fallback.hidden = false;
            return;
          }
          favicon.src = sources[sourceIndex];
          sourceIndex += 1;
        };

        favicon.addEventListener("load", () => {
          favicon.hidden = false;
          fallback.hidden = true;
        });
        favicon.addEventListener("error", tryNextSource);
        tryNextSource();

        const pinned = state.customizations.pinnedKeys.includes(bookmark.key);
        card.querySelector(".bookmark-domain").textContent = bookmark.domain || getHostname(bookmark.url);
        card.querySelector(".bookmark-rank").textContent = pinned
          ? "已置顶"
          : bookmark.isCustom
            ? "自定义"
            : `No. ${index + 1}`;
        card.querySelector(".bookmark-title").textContent = bookmark.title;
        card.querySelector(".bookmark-url").textContent = bookmark.url;

        const editButton = card.querySelector(".edit-button");
        editButton.dataset.bookmarkKey = bookmark.key;

        const pinButton = card.querySelector(".pin-button");
        pinButton.dataset.bookmarkKey = bookmark.key;
        pinButton.textContent = pinned ? "★" : "☆";
        pinButton.classList.toggle("is-active", pinned);

        const deleteButton = card.querySelector(".delete-button");
        deleteButton.dataset.bookmarkKey = bookmark.key;

        applyStatusToCard(card, bookmark);
        urlsToCheck.push(bookmark.url);
        grid.append(card);
      });
    }

    fragment.append(section);
  });

  elements.bookmarkRoot.append(fragment);
  queueStatusChecks(urlsToCheck);
}

function rerenderAll() {
  state.folders = applyCustomizations(state.rawFolders);
  updateStats(state.folders);
  renderHeroTags(state.folders);
  renderSpotlight(state.folders);
  renderFloatRibbon(state.folders);
  renderNetworkChart();
  renderBookmarks();
}

function loadData(payload, statusLabel, options = {}) {
  state.source = payload.source || "manual";
  state.profilePath = payload.profilePath || "未知来源";
  state.query = "";
  elements.searchInput.value = "";
  elements.statusText.textContent = statusLabel;
  elements.autoPath.textContent = `当前来源：${state.profilePath}`;
  setFolders(payload.folders || []);
  rerenderAll();
  if (options.persist !== false) {
    schedulePersistCurrentState();
  }
}

async function autoImportBookmarks() {
  if (!isLocalApiAvailable()) {
    switchToStaticMode();
    return;
  }

  elements.autoImport.disabled = true;
  elements.statusText.textContent = "正在自动导入";

  try {
    const response = await fetch("/api/bookmarks");
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "自动导入失败。");
    }
    loadData(payload, "已自动导入");
  } catch (error) {
    elements.statusText.textContent = "自动导入失败";
    elements.autoPath.textContent =
      error instanceof Error ? `自动导入失败：${error.message}` : "自动导入失败，请改用手动导入。";
  } finally {
    elements.autoImport.disabled = false;
  }
}

async function checkStatusBatch(urls) {
  const response = await fetch("/api/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ urls }),
  });
  if (!response.ok) {
    throw new Error("状态检测失败。");
  }
  return response.json();
}

async function queueStatusChecks(urls) {
  if (!isLocalApiAvailable()) {
    renderNetworkChart();
    return;
  }

  const uniqueUrls = [...new Set(urls)].filter(Boolean);
  const pending = uniqueUrls.filter((bookmarkUrl) => !state.statusMap.has(bookmarkUrl));
  if (!pending.length) {
    return;
  }

  const token = ++state.statusQueueToken;
  const batches = [];
  for (let index = 0; index < pending.length; index += STATUS_BATCH_SIZE) {
    batches.push(pending.slice(index, index + STATUS_BATCH_SIZE));
  }

  let nextBatchIndex = 0;
  const workers = Array.from({ length: Math.min(STATUS_CONCURRENCY, batches.length) }, async () => {
    while (nextBatchIndex < batches.length) {
      const batchIndex = nextBatchIndex;
      nextBatchIndex += 1;
      const batch = batches[batchIndex];
      try {
        const payload = await checkStatusBatch(batch);
        if (token !== state.statusQueueToken) {
          return;
        }
        (payload.results || []).forEach((result) => {
          state.statusMap.set(result.url, result);
        });
        refreshStatusDecorations();
      } catch {
        batch.forEach((bookmarkUrl) => {
          state.statusMap.set(bookmarkUrl, {
            url: bookmarkUrl,
            availability: "warning",
            region: "unknown",
            message: "状态检测失败，请稍后重试。",
          });
        });
        refreshStatusDecorations();
      }
    }
  });

  await Promise.all(workers);
}

function refreshStatusDecorations() {
  document.querySelectorAll(".bookmark-card[data-bookmark-key]").forEach((card) => {
    const bookmark = findBookmarkByKey(card.dataset.bookmarkKey);
    if (bookmark) {
      applyStatusToCard(card, bookmark);
    }
  });
  renderNetworkChart();
}

function addCustomBookmark(title, url, folderPathKey) {
  const folderPath = folderPathKey.split(" / ");
  const normalized = normalizeUrl(url);
  const safeTitle = sanitizeText(title);
  const bookmark = {
    title: safeTitle,
    url: normalized,
    domain: getHostname(normalized),
    path: folderPath,
    key: getBookmarkKey(folderPath, { title: safeTitle, url: normalized }),
  };

  state.customizations.addedBookmarks = state.customizations.addedBookmarks.filter(
    (item) => item.key !== bookmark.key
  );
  state.customizations.removedKeys = state.customizations.removedKeys.filter((item) => item !== bookmark.key);
  delete state.customizations.editedBookmarks[bookmark.key];
  state.customizations.addedBookmarks.unshift(bookmark);
  saveCustomizations();
  rerenderAll();
}

function removeBookmark(bookmarkKey) {
  if (!state.customizations.removedKeys.includes(bookmarkKey)) {
    state.customizations.removedKeys.push(bookmarkKey);
  }
  state.customizations.addedBookmarks = state.customizations.addedBookmarks.filter(
    (item) => item.key !== bookmarkKey
  );
  state.customizations.pinnedKeys = state.customizations.pinnedKeys.filter((item) => item !== bookmarkKey);
  delete state.customizations.editedBookmarks[bookmarkKey];
  delete state.customizations.visitCounts[bookmarkKey];
  saveCustomizations();
  rerenderAll();
}

function findBookmarkLocation(bookmarkKey) {
  for (const folder of state.folders) {
    const bookmark = folder.bookmarks.find((item) => item.key === bookmarkKey);
    if (bookmark) {
      return { bookmark, folder };
    }
  }
  return null;
}

function getOriginalFolderPathKey(bookmarkKey) {
  return bookmarkKey.split("::")[0] || "";
}

function moveBookmarkToFolder(bookmarkKey, targetFolderPathKey, override = {}) {
  const location = findBookmarkLocation(bookmarkKey);
  const targetPath = targetFolderPathKey.split(" / ").filter(Boolean);
  if (!location || !targetPath.length) {
    return false;
  }

  const currentPathKey = pathToKey(location.folder.path);
  const originalPathKey = getOriginalFolderPathKey(bookmarkKey);
  const normalizedUrl = override.url ? normalizeUrl(override.url) : location.bookmark.url;
  const hasOriginalBookmark = state.rawFolders.some((folder) =>
    folder.bookmarks.some((bookmark) => bookmark.key === bookmarkKey)
  );
  const nextBookmark = {
    title: sanitizeText(override.title, location.bookmark.title),
    url: normalizedUrl,
    domain: getHostname(normalizedUrl),
    path: targetPath,
    key: bookmarkKey,
  };
  const addedIndex = state.customizations.addedBookmarks.findIndex((item) => item.key === bookmarkKey);

  if (currentPathKey === targetFolderPathKey && addedIndex === -1) {
    return false;
  }

  if (hasOriginalBookmark && targetFolderPathKey === originalPathKey && addedIndex >= 0) {
    state.customizations.addedBookmarks.splice(addedIndex, 1);
    state.customizations.removedKeys = state.customizations.removedKeys.filter((item) => item !== bookmarkKey);
    return true;
  }

  if (addedIndex >= 0) {
    state.customizations.addedBookmarks[addedIndex] = {
      ...state.customizations.addedBookmarks[addedIndex],
      ...nextBookmark,
    };
  } else {
    state.customizations.addedBookmarks.unshift(nextBookmark);
  }

  if (!state.customizations.removedKeys.includes(bookmarkKey)) {
    state.customizations.removedKeys.push(bookmarkKey);
  }

  return true;
}

function removeFolder(folderPathKey) {
  if (!state.customizations.removedFolderKeys.includes(folderPathKey)) {
    state.customizations.removedFolderKeys.push(folderPathKey);
  }

  state.customizations.addedBookmarks = state.customizations.addedBookmarks.filter((item) => {
    const pathKey = pathToKey(item.path);
    return pathKey !== folderPathKey && !pathKey.startsWith(`${folderPathKey} / `);
  });

  const activeFolderKeys = new Set(
    state.rawFolders
      .map((folder) => normalizeFolder(folder))
      .filter((folder) => !isFolderRemoved(pathToKey(folder.path), new Set(state.customizations.removedFolderKeys)))
      .flatMap((folder) => folder.bookmarks.map((bookmark) => bookmark.key))
  );

  state.customizations.pinnedKeys = state.customizations.pinnedKeys.filter((item) => activeFolderKeys.has(item));
  state.customizations.removedKeys = state.customizations.removedKeys.filter((item) => activeFolderKeys.has(item));

  Object.keys(state.customizations.visitCounts).forEach((key) => {
    if (!activeFolderKeys.has(key)) {
      delete state.customizations.visitCounts[key];
    }
  });

  Object.keys(state.customizations.editedBookmarks).forEach((key) => {
    if (!activeFolderKeys.has(key)) {
      delete state.customizations.editedBookmarks[key];
    }
  });

  saveCustomizations();
  rerenderAll();
}

function togglePinned(bookmarkKey) {
  const pinned = new Set(state.customizations.pinnedKeys);
  if (pinned.has(bookmarkKey)) {
    pinned.delete(bookmarkKey);
  } else {
    pinned.add(bookmarkKey);
  }
  state.customizations.pinnedKeys = [...pinned];
  saveCustomizations();
  rerenderAll();
}

function incrementVisit(bookmarkKey) {
  state.customizations.visitCounts[bookmarkKey] = Number(state.customizations.visitCounts[bookmarkKey] || 0) + 1;
  saveCustomizations();
}

function openBookmark(bookmarkKey) {
  const bookmark = findBookmarkByKey(bookmarkKey);
  if (!bookmark) {
    return;
  }
  incrementVisit(bookmarkKey);
  renderSpotlight(state.folders);
  renderFloatRibbon(state.folders);
  window.open(bookmark.url, "_blank", "noopener,noreferrer");
}

function findBookmarkByKey(bookmarkKey) {
  return findBookmarkLocation(bookmarkKey)?.bookmark || null;
}

function openEditor(bookmarkKey) {
  const location = findBookmarkLocation(bookmarkKey);
  if (!location) {
    return;
  }
  const { bookmark, folder } = location;
  state.editingKey = bookmarkKey;
  elements.editorTitle.textContent = `修改「${bookmark.title}」`;
  elements.editorBookmarkTitle.value = bookmark.title;
  elements.editorBookmarkUrl.value = bookmark.url;
  populateFolderSelect(elements.editorFolderSelect, state.folders);
  elements.editorFolderSelect.value = pathToKey(folder.path);
  elements.editorDialog.showModal();
}

function closeEditor() {
  elements.editorDialog.close();
  state.editingKey = "";
}

function saveBookmarkEdit(bookmarkKey, title, url, targetFolderPathKey) {
  const normalizedUrl = normalizeUrl(url);
  const safeTitle = sanitizeText(title);
  state.customizations.editedBookmarks[bookmarkKey] = {
    title: safeTitle,
    url: normalizedUrl,
  };

  const customBookmark = state.customizations.addedBookmarks.find((item) => item.key === bookmarkKey);
  if (customBookmark) {
    customBookmark.title = safeTitle;
    customBookmark.url = normalizedUrl;
    customBookmark.domain = getHostname(normalizedUrl);
  }

  if (targetFolderPathKey) {
    moveBookmarkToFolder(bookmarkKey, targetFolderPathKey, {
      title: safeTitle,
      url: normalizedUrl,
    });
  }

  saveCustomizations();
  rerenderAll();
}

function toggleCardSize() {
  state.customizations.cardSize = state.customizations.cardSize === "compact" ? "comfortable" : "compact";
  saveCustomizations();
  applyCardSize();
}

function buildExportTree(folders) {
  const root = { children: new Map(), bookmarks: [] };
  folders.forEach((folder) => {
    let node = root;
    folder.path.forEach((segment) => {
      if (!node.children.has(segment)) {
        node.children.set(segment, { children: new Map(), bookmarks: [] });
      }
      node = node.children.get(segment);
    });
    folder.bookmarks.forEach((bookmark) => {
      node.bookmarks.push(bookmark);
    });
  });
  return root;
}

function treeToBookmarkHtml(node, depth = 1) {
  const indent = "    ".repeat(depth);
  let html = "";

  for (const [folderName, childNode] of node.children.entries()) {
    html += `${indent}<DT><H3>${escapeHtml(folderName)}</H3>\n`;
    html += `${indent}<DL><p>\n`;
    childNode.bookmarks.forEach((bookmark) => {
      html += `${indent}    <DT><A HREF="${escapeHtml(bookmark.url)}">${escapeHtml(bookmark.title)}</A>\n`;
    });
    html += treeToBookmarkHtml(childNode, depth + 1);
    html += `${indent}</DL><p>\n`;
  }

  return html;
}

function exportBookmarksAsHtml() {
  const tree = buildExportTree(state.folders);
  const content = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
${treeToBookmarkHtml(tree)}</DL><p>
`;

  const blob = new Blob([content], { type: "text/html;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = `bookmarks-export-${new Date().toISOString().slice(0, 10)}.html`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(blobUrl);
}

elements.autoImport.addEventListener("click", () => {
  if (!ensureEditorAccess("请先解锁编辑模式，再导入或刷新书签数据。")) {
    return;
  }
  void autoImportBookmarks();
});
elements.exportBookmarks.addEventListener("click", exportBookmarksAsHtml);

elements.fileInput.addEventListener("change", async (event) => {
  if (!ensureEditorAccess("请先解锁编辑模式，再导入新的书签数据。")) {
    event.target.value = "";
    return;
  }

  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    loadData(
      {
        source: "manual",
        profilePath: file.name,
        folders: parseBookmarks(text, file.name),
      },
      `已手动导入 ${file.name}`
    );
  } catch (error) {
    elements.statusText.textContent = "导入失败";
    elements.bookmarkRoot.innerHTML = `
      <div class="empty-state">
        <div class="empty-orb"></div>
        <h3>解析失败</h3>
        <p>${error instanceof Error ? error.message : "无法解析该文件。"}</p>
      </div>
    `;
  }
});

elements.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderBookmarks();
});

elements.bookmarkForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!ensureEditorAccess("请先解锁编辑模式，再新增书签。")) {
    return;
  }
  addCustomBookmark(elements.bookmarkTitle.value, elements.bookmarkUrlInput.value, elements.folderSelect.value);
  elements.bookmarkForm.reset();
});

elements.sizeToggle.addEventListener("click", toggleCardSize);

elements.folderNav.addEventListener("click", (event) => {
  const toggle = event.target.closest(".folder-toggle");
  const jump = event.target.closest("[data-target]");
  const deleteBookmarkButton = event.target.closest(".folder-preview-delete");
  const deleteFolderButton = event.target.closest(".folder-delete-button");

  if (deleteBookmarkButton) {
    event.preventDefault();
    if (!ensureEditorAccess("请先解锁编辑模式，再删除书签。")) {
      return;
    }
    removeBookmark(deleteBookmarkButton.dataset.bookmarkKey);
    return;
  }

  if (deleteFolderButton) {
    event.preventDefault();
    if (!ensureEditorAccess("请先解锁编辑模式，再删除分组。")) {
      return;
    }
    removeFolder(deleteFolderButton.dataset.folderPath);
    return;
  }

  if (toggle) {
    event.preventDefault();
    const key = toggle.dataset.path;
    if (state.navOpen.has(key)) {
      state.navOpen.delete(key);
    } else {
      state.navOpen.add(key);
    }
    renderNavigation(filterFolders());
    return;
  }

  if (jump) {
    event.preventDefault();
    const target = document.getElementById(jump.dataset.target);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
});

elements.folderNav.addEventListener("dragover", (event) => {
  if (!isEditorUnlocked()) {
    return;
  }
  const targetFolder = event.target.closest(".folder-nav-item[data-folder-path]");
  if (!targetFolder) {
    return;
  }
  event.preventDefault();
  targetFolder.classList.add("is-drop-target");
});

elements.folderNav.addEventListener("dragleave", (event) => {
  const targetFolder = event.target.closest(".folder-nav-item[data-folder-path]");
  if (targetFolder && !targetFolder.contains(event.relatedTarget)) {
    targetFolder.classList.remove("is-drop-target");
  }
});

elements.folderNav.addEventListener("drop", (event) => {
  if (!ensureEditorAccess("请先解锁编辑模式，再拖拽调整分组。")) {
    return;
  }
  const targetFolder = event.target.closest(".folder-nav-item[data-folder-path]");
  if (!targetFolder) {
    return;
  }
  event.preventDefault();
  targetFolder.classList.remove("is-drop-target");

  const bookmarkKey = event.dataTransfer.getData("text/plain");
  if (!bookmarkKey) {
    return;
  }

  if (moveBookmarkToFolder(bookmarkKey, targetFolder.dataset.folderPath)) {
    state.navOpen.add(targetFolder.dataset.folderPath);
    saveCustomizations();
    rerenderAll();
  }
});

elements.bookmarkRoot.addEventListener("click", (event) => {
  const deleteButton = event.target.closest(".delete-button");
  if (deleteButton) {
    event.preventDefault();
    if (!ensureEditorAccess("请先解锁编辑模式，再删除书签。")) {
      return;
    }
    removeBookmark(deleteButton.dataset.bookmarkKey);
    return;
  }

  const editButton = event.target.closest(".edit-button");
  if (editButton) {
    event.preventDefault();
    if (!ensureEditorAccess("请先解锁编辑模式，再编辑书签。")) {
      return;
    }
    openEditor(editButton.dataset.bookmarkKey);
    return;
  }

  const pinButton = event.target.closest(".pin-button");
  if (pinButton) {
    event.preventDefault();
    if (!ensureEditorAccess("请先解锁编辑模式，再调整置顶。")) {
      return;
    }
    togglePinned(pinButton.dataset.bookmarkKey);
    return;
  }

  const card = event.target.closest(".bookmark-card[data-bookmark-key]");
  if (!card) {
    return;
  }
  openBookmark(card.dataset.bookmarkKey);
});

elements.bookmarkRoot.addEventListener("dragstart", (event) => {
  if (!isEditorUnlocked()) {
    event.preventDefault();
    return;
  }
  const card = event.target.closest(".bookmark-card[data-bookmark-key]");
  if (!card) {
    return;
  }
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", card.dataset.bookmarkKey);
  card.classList.add("is-dragging");
});

elements.bookmarkRoot.addEventListener("dragend", () => {
  document.querySelectorAll(".is-dragging, .is-drop-target").forEach((item) => {
    item.classList.remove("is-dragging", "is-drop-target");
  });
});

elements.floatRibbon.addEventListener("click", (event) => {
  const item = event.target.closest(".float-ribbon-item");
  if (!item) {
    return;
  }
  event.preventDefault();
  openBookmark(item.dataset.bookmarkKey);
});

elements.editorAccess.addEventListener("click", () => {
  if (isEditorUnlocked()) {
    lockEditorMode();
    rerenderAll();
    return;
  }
  promptEditorUnlock();
});

elements.editorPasswordAccess.addEventListener("click", () => {
  if (!ensureEditorAccess("请先解锁编辑模式，再修改口令。")) {
    return;
  }
  openPasswordDialog("session");
});

elements.editorAuthCancel.addEventListener("click", () => elements.editorAuthDialog.close());
elements.editorAuthCancelTop.addEventListener("click", () => elements.editorAuthDialog.close());
elements.editorResetTrigger.addEventListener("click", () => {
  elements.editorAuthDialog.close();
  openPasswordDialog("recovery");
});
elements.editorAuthDialog.addEventListener("click", (event) => {
  const rect = elements.editorAuthDialog.getBoundingClientRect();
  const inDialog =
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom;
  if (!inDialog) {
    elements.editorAuthDialog.close();
  }
});

elements.editorPasswordCancel.addEventListener("click", closePasswordDialog);
elements.editorPasswordCancelTop.addEventListener("click", closePasswordDialog);
elements.editorPasswordDialog.addEventListener("click", (event) => {
  const rect = elements.editorPasswordDialog.getBoundingClientRect();
  const inDialog =
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom;
  if (!inDialog) {
    closePasswordDialog();
  }
});

elements.editorAuthForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = elements.editorAuthPassword.value.trim();
  if (!password) {
    elements.editorAuthMessage.textContent = "请输入编辑口令。";
    return;
  }

  elements.editorAuthMessage.textContent = "正在验证口令…";
  try {
    await verifyEditorPassword(password);
    unlockEditorMode(password);
    elements.editorAuthDialog.close();
    elements.editorAuthMessage.textContent = "本次会话只需输入一次，之后可以连续编辑。";
    rerenderAll();
  } catch (error) {
    elements.editorAuthMessage.textContent =
      error instanceof Error ? error.message : "口令验证失败，请重试。";
  }
});

elements.editorPasswordForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const nextPassword = elements.editorPasswordNext.value.trim();
  const confirmPassword = elements.editorPasswordConfirm.value.trim();
  const recoveryPassword = elements.editorPasswordRecovery.value.trim();
  const useRecovery = state.passwordDialogMode === "recovery";

  if (nextPassword.length < 3) {
    elements.editorPasswordMessage.textContent = "新口令至少需要 3 个字符。";
    return;
  }
  if (nextPassword !== confirmPassword) {
    elements.editorPasswordMessage.textContent = "两次输入的新口令不一致。";
    return;
  }
  if (useRecovery && !recoveryPassword) {
    elements.editorPasswordMessage.textContent = "请输入安全密码后再重设。";
    return;
  }

  elements.editorPasswordMessage.textContent = "正在保存新口令…";
  try {
    await changeEditorPassword({
      nextPassword,
      recoveryPassword: useRecovery ? recoveryPassword : "",
    });
    unlockEditorMode(nextPassword);
    closePasswordDialog();
    elements.editorAuthDialog.close();
    elements.editorAuthMessage.textContent = "口令已更新，现在可以直接进入编辑模式。";
    rerenderAll();
  } catch (error) {
    elements.editorPasswordMessage.textContent =
      error instanceof Error ? error.message : "修改口令失败，请稍后重试。";
  }
});

elements.editorCancel.addEventListener("click", closeEditor);
elements.editorCancelTop.addEventListener("click", closeEditor);
elements.editorDialog.addEventListener("click", (event) => {
  const rect = elements.editorDialog.getBoundingClientRect();
  const inDialog =
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom;
  if (!inDialog) {
    closeEditor();
  }
});

elements.editorForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!state.editingKey) {
    closeEditor();
    return;
  }
  if (!ensureEditorAccess("请先解锁编辑模式，再保存书签修改。")) {
    closeEditor();
    return;
  }
  saveBookmarkEdit(
    state.editingKey,
    elements.editorBookmarkTitle.value,
    elements.editorBookmarkUrl.value,
    elements.editorFolderSelect.value
  );
  closeEditor();
});

async function initializeApp() {
  updateEditorModeUi();
  const remoteSnapshot = await fetchRemoteSnapshot().catch(() => null);
  const localSnapshot = remoteSnapshot ? null : await readPersistedSnapshot().catch(() => null);
  const restoredSnapshot = remoteSnapshot || localSnapshot;

  if (restoredSnapshot) {
    applyCustomizationsState(restoredSnapshot.customizations);
    loadData(
      {
        source: restoredSnapshot.source || "manual",
        profilePath: restoredSnapshot.profilePath || "未知来源",
        folders: restoredSnapshot.rawFolders || restoredSnapshot.folders || [],
      },
      remoteSnapshot ? "已同步云端状态" : "已恢复上次保存",
      { persist: false }
    );
  } else {
    applyCustomizationsState(null);
    loadData(sampleData, "已载入示例", { persist: false });
  }

  applyCardSize();

  if (isLocalApiAvailable()) {
    void autoImportBookmarks();
    return;
  }

  switchToStaticMode(remoteSnapshot ? "已同步云端状态" : restoredSnapshot ? "已恢复上次保存" : "云端静态版");
}

void initializeApp();


