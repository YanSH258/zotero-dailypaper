import { config } from "../package.json";
import Addon from "./addon";

const addon = new Addon();
// @ts-expect-error dynamic plugin instance key on Zotero global
Zotero[config.addonInstance] = addon;
// @ts-expect-error global addon accessor for plugin modules
globalThis["addon"] = addon;
// @ts-expect-error global ztoolkit accessor for plugin modules
globalThis["ztoolkit"] = addon.data.ztoolkit;
