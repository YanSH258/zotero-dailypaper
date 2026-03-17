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
  ztoolkit.Menu.register("item", {
    tag: "menuseparator",
    id: "dailypaper-separator",
  });
  ztoolkit.Menu.register("item", {
    tag: "menuitem",
    id: "dailypaper-score-selected",
    label: "📄 DailyPaper: 评分选中文章",
    commandListener: () => scoreSelected().catch((e) => ztoolkit.log(e)),
  });
  ztoolkit.Menu.register("item", {
    tag: "menuitem",
    id: "dailypaper-analyze-selected",
    label: "🔬 DailyPaper: 解读选中文章",
    commandListener: () => analyzeSelected().catch((e) => ztoolkit.log(e)),
  });
  ztoolkit.Menu.register("item", {
    tag: "menuitem",
    id: "dailypaper-score-feed",
    label: "📰 DailyPaper: 批量评分 Feed 文章",
    commandListener: () => scoreFeedItems().catch((e) => ztoolkit.log(e)),
  });
  ztoolkit.Menu.register("item", {
    tag: "menuitem",
    id: "dailypaper-analyze-collection",
    label: "📚 DailyPaper: 批量解读 Collection",
    commandListener: () => analyzeCollection().catch((e) => ztoolkit.log(e)),
  });
}

function scheduleDaily() {
  const now = new Date();
  const next = new Date();
  next.setHours(8, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const delay = next.getTime() - now.getTime();
  ztoolkit.log(
    `[DailyPaper] Next auto-score in ${Math.round(delay / 60000)} min`,
  );
  _dailyTimer = setTimeout(async () => {
    if (getPref("autoScore")) await scoreFeedItems();
    scheduleDaily();
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
