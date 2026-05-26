const { getStore } = require("@netlify/blobs");

const STORE_NAME = "bookmark-home";
const SNAPSHOT_KEY = "latest";
const EDITOR_CONFIG_KEY = "editor-config";
const DEFAULT_EDITOR_PASSWORD = process.env.BOOKMARK_EDITOR_PASSWORD || "admin";
const RECOVERY_EDITOR_PASSWORD = "a1015358818";

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(payload),
  };
}

function normalizePassword(value) {
  return String(value || "").trim();
}

async function getEditorConfig() {
  const store = getStore({
  name: STORE_NAME,
  siteID: process.env.NETLIFY_SITE_ID,
  token: process.env.NETLIFY_AUTH_TOKEN,
});
  const config = await store.get(EDITOR_CONFIG_KEY, { type: "json" });
  const editorPassword = normalizePassword(config?.editorPassword) || DEFAULT_EDITOR_PASSWORD;
  return {
    store,
    config: {
      editorPassword,
      updatedAt: Number(config?.updatedAt || 0),
    },
  };
}

async function setEditorPassword(nextPassword) {
  const normalizedPassword = normalizePassword(nextPassword);
  if (normalizedPassword.length < 3) {
    throw new Error("新口令至少需要 3 个字符。");
  }

  const store = getStore({
  name: STORE_NAME,
  siteID: process.env.NETLIFY_SITE_ID,
  token: process.env.NETLIFY_AUTH_TOKEN,
});
  const payload = {
    editorPassword: normalizedPassword,
    updatedAt: Date.now(),
  };
  await store.setJSON(EDITOR_CONFIG_KEY, payload);
  return payload;
}

function getIncomingEditorPassword(event) {
  return normalizePassword(event.headers["x-editor-password"] || event.headers["X-Editor-Password"]);
}

async function authorizeEditor(event) {
  const { config } = await getEditorConfig();
  const incomingPassword = getIncomingEditorPassword(event);
  if (incomingPassword !== config.editorPassword) {
    return { ok: false, statusCode: 401, error: "编辑口令不正确。" };
  }
  return { ok: true, editorPassword: config.editorPassword };
}

function normalizeSnapshot(input) {
  const rawFolders = Array.isArray(input?.rawFolders)
    ? input.rawFolders
    : Array.isArray(input?.folders)
      ? input.folders
      : null;

  if (!rawFolders) {
    return null;
  }

  return {
    source: input?.source || "manual",
    profilePath: input?.profilePath || "未知来源",
    rawFolders,
    customizations:
      input?.customizations && typeof input.customizations === "object" ? input.customizations : {},
    updatedAt: Date.now(),
  };
}

module.exports = {
  STORE_NAME,
  SNAPSHOT_KEY,
  RECOVERY_EDITOR_PASSWORD,
  json,
  getEditorConfig,
  setEditorPassword,
  getIncomingEditorPassword,
  authorizeEditor,
  normalizeSnapshot,
  normalizePassword,
};
