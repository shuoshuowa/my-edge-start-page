const dns = require("dns").promises;

const STATUS_CACHE_TTL_MS = 5 * 60 * 1000;
const STATUS_TIMEOUT_MS = 8000;
const statusCache = new Map();

const REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
};

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

function getHostname(rawUrl) {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "");
  } catch {
    return rawUrl;
  }
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

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method Not Allowed" });
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const urls = Array.isArray(body.urls) ? body.urls.filter(Boolean).slice(0, 20) : [];
    const results = await Promise.all(urls.map((bookmarkUrl) => probeUrl(bookmarkUrl)));
    return json(200, { results });
  } catch (error) {
    return json(500, {
      error: error instanceof Error ? error.message : "状态检测失败。",
    });
  }
};
