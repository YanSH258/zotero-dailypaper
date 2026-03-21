import { initLocale } from "./utils/locale";
import { registerPrefsScripts } from "./modules/preferenceScript";
import { createZToolkit } from "./utils/ztoolkit";
import { getPref } from "./utils/prefs";
import {
  scoreSelected,
  analyzeSelected,
  scoreFeedItems,
  analyzeCollection,
} from "./modules/dailypaper";

let _dailyTimer: ReturnType<typeof setTimeout> | null = null;

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);
  initLocale();

  Zotero.PreferencePanes.register({
    pluginID: addon.data.config.addonID,
    src: `chrome://${addon.data.config.addonRef}/content/preferences.xhtml`,
    label: "Daily Paper Digest",
    image: `chrome://${addon.data.config.addonRef}/content/icons/favicon.png`,
  });

  await Promise.all(
    Zotero.getMainWindows().map((win) => onMainWindowLoad(win)),
  );

  scheduleDaily();
  addon.data.initialized = true;
}

async function onMainWindowLoad(win: _ZoteroTypes.MainWindow): Promise<void> {
  addon.data.ztoolkit = createZToolkit();
  registerMenuItems(win);
}

async function onMainWindowUnload(win: Window): Promise<void> {
  ztoolkit.unregisterAll();
  addon.data.dialog?.window?.close();
}

function onShutdown(): void {
  if (_dailyTimer) {
    clearTimeout(_dailyTimer);
    _dailyTimer = null;
  }
  ztoolkit.unregisterAll();
  addon.data.dialog?.window?.close();
  addon.data.alive = false;
  // @ts-expect-error
  delete Zotero[addon.data.config.addonInstance];
}

async function onNotify(
  event: string,
  type: string,
  ids: Array<string | number>,
  extraData: { [key: string]: any },
) {}

async function onPrefsEvent(type: string, data: { [key: string]: any }) {
  if (type === "load") registerPrefsScripts(data.window);
}

function onShortcuts(_type: string) {}

function onDialogEvents(_type: string) {}

function registerMenuItems(win: _ZoteroTypes.MainWindow) {
  ztoolkit.log("[DailyPaper] 开始注册菜单...");

  try {
    // ========== 注册右键菜单（主要入口）==========
    const itemMenu = win.document.getElementById("zotero-itemmenu");
    if (itemMenu) {
      // 添加分隔符
      const sep = win.document.createXULElement("menuseparator");
      sep.id = "dailypaper-context-sep";
      itemMenu.appendChild(sep);

      // 添加右键菜单项
      const contextMenuItems = [
        {
          id: "dailypaper-context-score",
          label: "📄 DailyPaper: 评分选中文章",
          action: scoreSelected,
        },
        {
          id: "dailypaper-context-analyze",
          label: "🔬 DailyPaper: 解读选中文章",
          action: analyzeSelected,
        },
        {
          id: "dailypaper-context-score-feed",
          label: "📰 DailyPaper: 批量评分 Feed 文章",
          action: scoreFeedItems,
        },
        {
          id: "dailypaper-context-analyze-collection",
          label: "📚 DailyPaper: 批量解读 Collection",
          action: analyzeCollection,
        },
      ];

      contextMenuItems.forEach((item) => {
        const mi = win.document.createXULElement("menuitem");
        mi.id = item.id;
        mi.label = item.label;
        mi.addEventListener("command", () => {
          item.action().catch((e) => {
            ztoolkit.log(`[DailyPaper] 菜单执行错误: ${e.message}`);
            Zotero.alert(
              win,
              "DailyPaper 错误",
              `执行失败: ${e.message}\n\n请检查 API 配置是否正确`,
            );
          });
        });
        itemMenu.appendChild(mi);
        ztoolkit.log(`[DailyPaper] 已注册右键菜单: ${item.label}`);
      });
      
      ztoolkit.log("[DailyPaper] ✅ 右键菜单注册成功");
    } else {
      ztoolkit.log("[DailyPaper] ❌ 未找到右键菜单容器");
    }

    // ========== 注册工具菜单（备选入口）==========
    const toolsPopup = win.document.getElementById("menu_ToolsPopup");
    if (toolsPopup) {
      // 添加分隔符
      const sep = win.document.createXULElement("menuseparator");
      sep.id = "dailypaper-tools-sep";
      toolsPopup.appendChild(sep);

      // 添加工具菜单项
      const toolsMenuItems = [
        {
          id: "dailypaper-tools-score",
          label: "📄 DailyPaper: 评分选中文章",
          action: scoreSelected,
        },
        {
          id: "dailypaper-tools-analyze",
          label: "🔬 DailyPaper: 解读选中文章",
          action: analyzeSelected,
        },
        {
          id: "dailypaper-tools-score-feed",
          label: "📰 DailyPaper: 批量评分 Feed 文章",
          action: scoreFeedItems,
        },
        {
          id: "dailypaper-tools-analyze-collection",
          label: "📚 DailyPaper: 批量解读 Collection",
          action: analyzeCollection,
        },
      ];

      toolsMenuItems.forEach((item) => {
        const mi = win.document.createXULElement("menuitem");
        mi.id = item.id;
        mi.label = item.label;
        mi.addEventListener("command", () => {
          item.action().catch((e) => {
            ztoolkit.log(`[DailyPaper] 菜单执行错误: ${e.message}`);
            Zotero.alert(
              win,
              "DailyPaper 错误",
              `执行失败: ${e.message}\n\n请检查 API 配置是否正确`,
            );
          });
        });
        toolsPopup.appendChild(mi);
      });
      
      ztoolkit.log("[DailyPaper] ✅ 工具菜单注册成功");
    } else {
      ztoolkit.log("[DailyPaper] ❌ 未找到工具菜单容器");
    }
  } catch (e: any) {
    ztoolkit.log(`[DailyPaper] ❌ 菜单注册失败: ${e.message}`);
  }

  ztoolkit.log("[DailyPaper] 菜单注册完成");
}

function scheduleDaily() {
  // 读取配置的自动评分时间（默认 8:00）
  const hour = (getPref("autoScoreHour") as number) ?? 8;
  const minute = (getPref("autoScoreMinute") as number) ?? 0;
  
  const now = new Date();
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  
  // 如果今天的时间已过，设置为明天
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  
  const delay = next.getTime() - now.getTime();
  ztoolkit.log(
    `[DailyPaper] 下次自动评分时间: ${next.toLocaleString("zh-CN")} (${Math.round(delay / 60000)} 分钟后)`,
  );
  
  _dailyTimer = setTimeout(async () => {
    if (getPref("autoScore")) {
      ztoolkit.log("[DailyPaper] 开始执行定时自动评分...");
      await scoreFeedItems();
    }
    scheduleDaily(); // 重新调度下一次
  }, delay);
}

export default {
  onStartup,
  onShutdown,
  onMainWindowLoad,
  onMainWindowUnload,
  onNotify,
  onPrefsEvent,
  onShortcuts,
  onDialogEvents,
};
