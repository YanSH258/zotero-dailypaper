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
    
    // 使用 blur 事件确保在失去焦点时保存
    topicsEl.addEventListener("blur", () => {
      Zotero.Prefs.set("extensions.dailypaper.researchTopics", topicsEl.value, true);
      console.log("[DailyPaper] 研究方向已保存:", topicsEl.value);
    });
    
    // 同时保留 change 事件作为备用
    topicsEl.addEventListener("change", () => {
      Zotero.Prefs.set("extensions.dailypaper.researchTopics", topicsEl.value, true);
      console.log("[DailyPaper] 研究方向已保存(change):", topicsEl.value);
    });
  }

  // Prompt 配置的 textarea 同步
  const promptFields = [
    { id: "scorePromptBase", pref: "extensions.dailypaper.scorePromptBase" },
    { id: "analyzePromptFulltext", pref: "extensions.dailypaper.analyzePromptFulltext" },
    { id: "analyzePromptAbstract", pref: "extensions.dailypaper.analyzePromptAbstract" },
  ];

  for (const field of promptFields) {
    const el = doc.getElementById(`${prefix}-${field.id}`) as HTMLTextAreaElement | null;
    if (el) {
      el.value = (Zotero.Prefs.get(field.pref, true) as string) || "";
      
      el.addEventListener("blur", () => {
        Zotero.Prefs.set(field.pref, el.value, true);
        console.log(`[DailyPaper] ${field.id} 已保存`);
      });
      
      el.addEventListener("change", () => {
        Zotero.Prefs.set(field.pref, el.value, true);
        console.log(`[DailyPaper] ${field.id} 已保存(change)`);
      });
    }
  }

  // 自动评分时间输入框同步
  const autoScoreHourEl = doc.getElementById(
    `${prefix}-autoScoreHour`,
  ) as HTMLInputElement | null;
  const autoScoreMinuteEl = doc.getElementById(
    `${prefix}-autoScoreMinute`,
  ) as HTMLInputElement | null;

  if (autoScoreHourEl) {
    autoScoreHourEl.value = String(
      Zotero.Prefs.get("extensions.dailypaper.autoScoreHour", true) || 8,
    );
    autoScoreHourEl.addEventListener("change", () => {
      let val = parseInt(autoScoreHourEl.value) || 8;
      val = Math.max(0, Math.min(23, val));
      autoScoreHourEl.value = String(val);
      Zotero.Prefs.set("extensions.dailypaper.autoScoreHour", val, true);
      console.log(`[DailyPaper] 自动评分小时已设置为: ${val}`);
    });
  }

  if (autoScoreMinuteEl) {
    autoScoreMinuteEl.value = String(
      Zotero.Prefs.get("extensions.dailypaper.autoScoreMinute", true) || 0,
    );
    autoScoreMinuteEl.addEventListener("change", () => {
      let val = parseInt(autoScoreMinuteEl.value) || 0;
      val = Math.max(0, Math.min(59, val));
      autoScoreMinuteEl.value = String(val);
      Zotero.Prefs.set("extensions.dailypaper.autoScoreMinute", val, true);
      console.log(`[DailyPaper] 自动评分分钟已设置为: ${val}`);
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
