const { getStore } = require("@netlify/blobs");
const { STORE_NAME, SNAPSHOT_KEY, json, authorizeEditor, normalizeSnapshot } = require("./lib/shared");

exports.handler = async (event) => {
  const store = getStore({
  name: STORE_NAME,
  siteID: process.env.NETLIFY_SITE_ID,
  token: process.env.NETLIFY_AUTH_TOKEN,
});
  if (event.httpMethod === "GET") {
    const snapshot = await store.get(SNAPSHOT_KEY, { type: "json" });
    return snapshot ? json(200, snapshot) : json(404, { error: "没有找到已保存的书签状态。" });
  }

  if (event.httpMethod === "POST") {
    const auth = await authorizeEditor(event);
    if (!auth.ok) {
      return json(auth.statusCode, { error: auth.error });
    }

    try {
      const payload = event.body ? JSON.parse(event.body) : {};
      const snapshot = normalizeSnapshot(payload);
      if (!snapshot) {
        return json(400, { error: "缺少可保存的书签数据。" });
      }

      await store.setJSON(SNAPSHOT_KEY, snapshot);
      return json(200, { ok: true, updatedAt: snapshot.updatedAt });
    } catch (error) {
      return json(500, {
        error: error instanceof Error ? error.message : "保存书签状态失败。",
      });
    }
  }

  return json(405, { error: "Method Not Allowed" });
};
