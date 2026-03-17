import { config } from "../../package.json";

export async function registerPrefsScripts(_window: Window) {
  if (!addon.data.prefs) {
    addon.data.prefs = {
      window: _window,
      columns: [],
      rows: [],
    };
  } else {
    addon.data.prefs.window = _window;
  }
  bindPrefEvents(_window);
}

function bindPrefEvents(_window: Window) {
  const doc = _window.document;
  const prefix = `zotero-prefpane-${config.addonRef}`;

  // textarea 手动同步（preference 属性对 textarea 不生效）
  const topicsEl = doc.getElementById(
    `${prefix}-researchTopics`,
  ) as HTMLTextAreaElement | null;
  if (topicsEl) {
    topicsEl.value =
      (Zotero.Prefs.get("extensions.dailypaper.researchTopics", true) as string) || "";
    topicsEl.addEventListener("change", () => {
      Zotero.Prefs.set("extensions.dailypaper.researchTopics", topicsEl.value, true);
    });
  }

  // 测试 API 连接按钮
  const testBtn = doc.getElementById("dailypaper-test-api");
  const testResult = doc.getElementById("dailypaper-test-result");
  if (testBtn && testResult) {
    testBtn.addEventListener("click", async () => {
      const apiKey = (Zotero.Prefs.get("extensions.dailypaper.apiKey", true) as string) || "";
      const apiBase = (Zotero.Prefs.get("extensions.dailypaper.apiBase", true) as string) || "https://api.deepseek.com/v1";
      const apiModel = (Zotero.Prefs.get("extensions.dailypaper.apiModel", true) as string) || "deepseek-chat";

      if (!apiKey) {
        testResult.textContent = "❌ 请先填写 API Key";
        return;
      }
      testResult.textContent = "⏳ 测试中...";
      try {
        const resp = await fetch(`${apiBase}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: apiModel,
            max_tokens: 10,
            messages: [{ role: "user", content: "hi" }],
          }),
        });
        if (resp.ok) {
          testResult.textContent = "✅ 连接成功";
          (testResult as HTMLElement).style.color = "green";
        } else {
          const err = await resp.text();
          testResult.textContent = `❌ ${resp.status}: ${err.slice(0, 60)}`;
          (testResult as HTMLElement).style.color = "red";
        }
      } catch (e) {
        testResult.textContent = `❌ 网络错误: ${e}`;
        (testResult as HTMLElement).style.color = "red";
      }
    });
  }
}
