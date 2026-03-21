import { ZoteroToolkit } from "zotero-plugin-toolkit";

declare global {
  const _globalThis: {
    [key: string]: any;
    Zotero: _ZoteroTypes.Zotero;
    ztoolkit: ZToolkit;
    addon: typeof addon;
  };

  type ZToolkit = ZoteroToolkit;

  const ztoolkit: ZToolkit;

  const rootURI: string;

  const addon: import("../src/addon").default;

  const __env__: "production" | "development";
}

export {};
