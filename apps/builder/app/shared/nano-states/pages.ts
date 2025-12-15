import { atom } from "nanostores";
import type { Page } from "@webstudio-is/sdk";
import { $pages } from "../sync/data-stores";

// Re-export for backward compatibility
export { $pages };

export const $selectedPageHash = atom<{ hash: string }>({ hash: "" });

export const $editingPageId = atom<undefined | Page["id"]>();
