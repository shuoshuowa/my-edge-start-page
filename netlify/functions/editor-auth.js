const { json, getEditorConfig, normalizePassword } = require("./lib/shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method Not Allowed" });
  }

  try {
    const { config } = await getEditorConfig();
    const body = event.body ? JSON.parse(event.body) : {};
    if (normalizePassword(body?.password) !== config.editorPassword) {
      return json(401, { error: "编辑口令不正确。" });
    }

    return json(200, { ok: true });
  } catch (error) {
    return json(500, {
      error: error instanceof Error ? error.message : "编辑口令验证失败。",
    });
  }
};
