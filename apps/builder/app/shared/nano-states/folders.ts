import { atom } from "nanostores";
import type { Folder } from "@webstudio-is/sdk";

export const $folders = atom<undefined | Map<Folder["id"], Folder>>(undefined);
