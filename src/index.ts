import { config } from "../package.json";
import Addon from "./addon";

const addon = new Addon();
// @ts-expect-error
Zotero[config.addonInstance] = addon;
// @ts-expect-error
globalThis["addon"] = addon;
// @ts-expect-error
globalThis["ztoolkit"] = addon.data.ztoolkit;
