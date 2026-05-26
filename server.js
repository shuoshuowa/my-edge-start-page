const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const dns = require("dns").promises;

const PORT = 4173;
const HOST = "127.0.0.1";
const ROOT = __dirname;
const LOCAL_STATE_DIR = path.join(ROOT, ".state");
const LOCAL_STATE_FILE = path.join(LOCAL_STATE_DIR, "bookmark-state.json");
const LOCAL_EDITOR_FILE = path.join(LOCAL_STATE_DIR, "editor-config.json");
const STATUS_CACHE_TTL_MS = 5 * 60 * 1000;
const STATUS_TIMEOUT_MS = 8000;
const DEFAULT_EDITOR_PASSWORD = process.env.BOOKMARK_EDITOR_PASSWORD || "admin";
const RECOVERY_EDITOR_PASSWORD = "a1015358818";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

const REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
};

const statusCache = new Map();

function ensureStateDir() {
  fs.mkdirSync(LOCAL_STATE_DIR, { recursive: true });
}

function normalizePassword(value) {
  return String(value || "").trim();
}

function sanitizeText(value, fallback = "") {
  return String(value || fallback)
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getHostname(rawUrl) {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "");
  } catch {
    return rawUrl;
  }
}

function readEditorConfigFile() {
  if (!fs.existsSync(LOCAL_EDITOR_FILE)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(LOCAL_EDITOR_FILE, "utf8");
    const parsed = JSON.parse(raw);
    const editorPassword = normalizePassword(parsed?.editorPassword);
    if (!editorPassword) {
      return null;
    }
    return {
      editorPassword,
      updatedAt: Number(parsed?.updatedAt || 0),
    };
  } catch {
    return null;
  }
}

function getEditorConfig() {
  return readEditorConfigFile() || { editorPassword: DEFAULT_EDITOR_PASSWORD, updatedAt: 0 };
}

function getEditorPassword() {
  return getEditorConfig().editorPassword;
}

function writeEditorConfigFile(editorPassword) {
  const nextPassword = normalizePassword(editorPassword);
  if (nextPassword.length < 3) {
    throw new Error("新口令至少需要 3 个字符。");
  }

  ensureStateDir();
  const payload = {
    editorPassword: nextPassword,
    updatedAt: Date.now(),
  };
  fs.writeFileSync(LOCAL_EDITOR_FILE, JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

function resolveBookmarkCandidates() {
  const candidates = [];
  const localAppData = process.env.LOCALAPPDATA;
  const userProfile = process.env.USERPROFILE;

  if (localAppData) {
    candidates.push(path.join(localAppData, "Microsoft", "Edge", "User Data", "Default", "Bookmarks"));
  }
  if (userProfile) {
    candidates.push(
      path.join(
        userProfile,
        "AppData",
        "Local",
        "Microsoft",
        "Edge",
        "User Data",
        "Default",
        "Bookmarks"
      )
    );
  }

  return [...new Set(candidates)];
}

function parseBookmarkJson(raw) {
  const data = JSON.parse(raw);
  const roots = data?.roots;

  if (!roots || typeof roots !== "object") {
    throw new Error("没有找到可用的 Edge 书签结构。");
  }

  const folders = [];

  const walkNode = (node, trail = []) => {
    if (!node || node.type !== "folder") {
      return;
    }

    const nodeName = sanitizeText(node.name, "未命名分组");
    const currentTrail = [...trail, nodeName];
    const children = Array.isArray(node.children) ? node.children : [];
    const childFolders = children.filter((child) => child.type === "folder");
    const bookmarks = children
      .filter((child) => child.type === "url" && child.url)
      .map((child) => ({
        title: sanitizeText(child.name, child.url),
        url: child.url,
        domain: getHostname(child.url),
      }));

    folders.push({
      name: nodeName,
      path: currentTrail,
      bookmarks,
      childFolderCount: childFolders.length,
      isEmpty: bookmarks.length === 0 && childFolders.length === 0,
    });

    childFolders.forEach((child) => walkNode(child, currentTrail));
  };

  Object.values(roots).forEach((rootNode) => walkNode(rootNode));
  return folders;
}

function inferRegionFromHostname(hostname) {
  const lower = (hostname || "").toLowerCase();

  if (!lower) {
    return "unknown";
  }
  if (
    lower === "localhost" ||
    lower.startsWith("127.") ||
    lower.startsWith("10.") ||
    lower.startsWith("192.168.") ||
    lower.startsWith("172.16.")
  ) {
    return "local";
  }
  if (
    lower.endsWith(".cn") ||
    /(?:qq|baidu|taobao|tmall|jd|bilibili|douyin|zhihu|aliyun|feishu|weixin|weibo|163|126|sina|tencent)\./.test(
      lower
    )
  ) {
    return "cn";
  }
  return "overseas";
}

function makeReachableResult(rawUrl, region, statusCode, method) {
  return {
    url: rawUrl,
    region,
    availability: statusCode >= 500 ? "warning" : "online",
    statusCode,
    message:
      statusCode >= 500
        ? `站点返回 ${statusCode}，建议人工确认。`
        : method === "HEAD" && statusCode >= 400
          ? "站点拒绝 HEAD 探测，但基本可达。"
          : "",
    checkedAt: Date.now(),
  };
}

async function probeUrl(rawUrl) {
  const cached = statusCache.get(rawUrl);
  if (cached && Date.now() - cached.checkedAt < STATUS_CACHE_TTL_MS) {
    return cached;
  }

  const hostname = getHostname(rawUrl);
  const region = inferRegionFromHostname(hostname);

  try {
    await dns.lookup(hostname);
  } catch {
    const result = {
      url: rawUrl,
      region,
      availability: "offline",
      message: "DNS 解析失败，站点可能已经失效。",
      checkedAt: Date.now(),
    };
    statusCache.set(rawUrl, result);
    return result;
  }

  try {
    const headResponse = await fetch(rawUrl, {
      method: "HEAD",
      redirect: "follow",
      headers: REQUEST_HEADERS,
      signal: AbortSignal.timeout(STATUS_TIMEOUT_MS),
    });
    const result = makeReachableResult(rawUrl, region, headResponse.status, "HEAD");
    statusCache.set(rawUrl, result);
    return result;
  } catch (headError) {
    try {
      const getResponse = await fetch(rawUrl, {
        method: "GET",
        redirect: "follow",
        headers: {
          ...REQUEST_HEADERS,
          Range: "bytes=0-0",
        },
        signal: AbortSignal.timeout(STATUS_TIMEOUT_MS),
      });
      const result = makeReachableResult(rawUrl, region, getResponse.status, "GET");
      statusCache.set(rawUrl, result);
      return result;
    } catch (getError) {
      const isTimeout = headError?.name === "TimeoutError" || getError?.name === "TimeoutError";
      const overseas = region === "overseas";
      const result = {
        url: rawUrl,
        region,
        availability: "warning",
        message: isTimeout
          ? overseas
            ? "探测超时，可能是当前检测服务未走代理，但浏览器里仍可能可访问。"
            : "请求超时，当前网络下访问不稳定。"
          : overseas
            ? "连接失败，可能是当前检测服务未走代理。"
            : "访问失败，建议人工确认。",
        checkedAt: Date.now(),
      };
      statusCache.set(rawUrl, result);
      return result;
    }
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload, null, 2));
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  fs.readFile(filePath, (error, buffer) => {
    if (error) {
      sendJson(res, 404, { error: "找不到请求的文件。" });
      return;
    }

    res.writeHead(200, { "Content-Type": contentType });
    res.end(buffer);
  });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function requireEditorAuth(req, res) {
  const incomingPassword = normalizePassword(req.headers["x-editor-password"]);
  if (incomingPassword !== getEditorPassword()) {
    sendJson(res, 401, { error: "编辑口令不正确。" });
    return false;
  }

  return true;
}

function normalizeStatePayload(payload) {
  const rawFolders = Array.isArray(payload?.rawFolders)
    ? payload.rawFolders
    : Array.isArray(payload?.folders)
      ? payload.folders
      : null;

  if (!rawFolders) {
    return null;
  }

  return {
    source: payload?.source || "manual",
    profilePath: payload?.profilePath || "未知来源",
    rawFolders,
    customizations:
      payload?.customizations && typeof payload.customizations === "object" ? payload.customizations : {},
    updatedAt: Date.now(),
  };
}

function readBookmarkStateFile() {
  if (!fs.existsSync(LOCAL_STATE_FILE)) {
    return null;
  }

  const raw = fs.readFileSync(LOCAL_STATE_FILE, "utf8");
  return normalizeStatePayload(JSON.parse(raw));
}

function writeBookmarkStateFile(payload) {
  const snapshot = normalizeStatePayload(payload);
  if (!snapshot) {
    throw new Error("缺少可保存的书签状态。");
  }

  ensureStateDir();
  fs.writeFileSync(LOCAL_STATE_FILE, JSON.stringify(snapshot, null, 2), "utf8");
  return snapshot;
}

function handleBookmarkApi(res) {
  const candidates = resolveBookmarkCandidates();

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) {
      continue;
    }

    const raw = fs.readFileSync(candidate, "utf8");
    sendJson(res, 200, {
      source: "auto",
      profilePath: candidate,
      folders: parseBookmarkJson(raw),
    });
    return;
  }

  sendJson(res, 404, {
    error: "没有在默认 Edge 用户目录中找到 Bookmarks 文件。",
    checkedPaths: candidates,
  });
}

async function handleStatusApi(req, res) {
  const body = await readJsonBody(req);
  const urls = Array.isArray(body.urls) ? body.urls.filter(Boolean).slice(0, 20) : [];
  const results = await Promise.all(urls.map((bookmarkUrl) => probeUrl(bookmarkUrl)));
  sendJson(res, 200, { results });
}

async function handleEditorAuthApi(req, res) {
  const body = await readJsonBody(req);
  const password = normalizePassword(body?.password);
  if (password !== getEditorPassword()) {
    sendJson(res, 401, { error: "编辑口令不正确。" });
    return;
  }

  sendJson(res, 200, { ok: true });
}

async function handleEditorPasswordApi(req, res) {
  const body = await readJsonBody(req);
  const nextPassword = normalizePassword(body?.nextPassword);
  const recoveryPassword = normalizePassword(body?.recoveryPassword);
  const sessionPassword = normalizePassword(req.headers["x-editor-password"]);
  const currentPassword = getEditorPassword();

  if (nextPassword.length < 3) {
    sendJson(res, 400, { error: "新口令至少需要 3 个字符。" });
    return;
  }

  if (sessionPassword !== currentPassword && recoveryPassword !== RECOVERY_EDITOR_PASSWORD) {
    sendJson(res, 401, { error: "当前口令或安全密码不正确。" });
    return;
  }

  const config = writeEditorConfigFile(nextPassword);
  sendJson(res, 200, { ok: true, updatedAt: config.updatedAt });
}

async function handleBookmarkStateApi(req, res) {
  if (req.method === "GET") {
    const snapshot = readBookmarkStateFile();
    if (!snapshot) {
      sendJson(res, 404, { error: "没有找到已保存的书签状态。" });
      return;
    }
    sendJson(res, 200, snapshot);
    return;
  }

  if (!requireEditorAuth(req, res)) {
    return;
  }

  if (req.method === "POST") {
    const body = await readJsonBody(req);
    const snapshot = writeBookmarkStateFile(body);
    sendJson(res, 200, { ok: true, updatedAt: snapshot.updatedAt });
    return;
  }

  sendJson(res, 405, { error: "Method Not Allowed" });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url || "/");
  const pathname = parsedUrl.pathname || "/";

  if (pathname === "/api/bookmarks" && req.method === "GET") {
    try {
      handleBookmarkApi(res);
    } catch (error) {
      sendJson(res, 500, {
        error: error instanceof Error ? error.message : "读取书签时发生未知错误。",
      });
    }
    return;
  }

  if (pathname === "/api/status" && req.method === "POST") {
    try {
      await handleStatusApi(req, res);
    } catch (error) {
      sendJson(res, 500, {
        error: error instanceof Error ? error.message : "状态检测失败。",
      });
    }
    return;
  }

  if (pathname === "/api/editor-auth" && req.method === "POST") {
    try {
      await handleEditorAuthApi(req, res);
    } catch (error) {
      sendJson(res, 500, {
        error: error instanceof Error ? error.message : "编辑口令验证失败。",
      });
    }
    return;
  }

  if (pathname === "/api/editor-password" && req.method === "POST") {
    try {
      await handleEditorPasswordApi(req, res);
    } catch (error) {
      sendJson(res, 500, {
        error: error instanceof Error ? error.message : "修改编辑口令失败。",
      });
    }
    return;
  }

  if (pathname === "/api/bookmark-state" && (req.method === "GET" || req.method === "POST")) {
    try {
      await handleBookmarkStateApi(req, res);
    } catch (error) {
      sendJson(res, 500, {
        error: error instanceof Error ? error.message : "保存书签状态失败。",
      });
    }
    return;
  }

  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  if (relativePath.startsWith(".state")) {
    sendJson(res, 403, { error: "非法路径。" });
    return;
  }

  const normalized = path.normalize(path.join(ROOT, relativePath));
  if (!normalized.startsWith(ROOT)) {
    sendJson(res, 403, { error: "非法路径。" });
    return;
  }

  sendFile(res, normalized);
});

server.listen(PORT, HOST, () => {
  console.log(`My Edge Start Page running at http://${HOST}:${PORT}`);
});
