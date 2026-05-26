const {
  RECOVERY_EDITOR_PASSWORD,
  authorizeEditor,
  json,
  normalizePassword,
  setEditorPassword,
} = require("./lib/shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method Not Allowed" });
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const nextPassword = normalizePassword(body?.nextPassword);
    const recoveryPassword = normalizePassword(body?.recoveryPassword);

    if (nextPassword.length < 3) {
      return json(400, { error: "新口令至少需要 3 个字符。" });
    }

    const auth = await authorizeEditor(event);
    const recoveryMatched = recoveryPassword === RECOVERY_EDITOR_PASSWORD;

    if (!auth.ok && !recoveryMatched) {
      return json(401, { error: "当前口令或安全密码不正确。" });
    }

    const payload = await setEditorPassword(nextPassword);
    return json(200, { ok: true, updatedAt: payload.updatedAt });
  } catch (error) {
    return json(500, {
      error: error instanceof Error ? error.message : "修改编辑口令失败。",
    });
  }
};
