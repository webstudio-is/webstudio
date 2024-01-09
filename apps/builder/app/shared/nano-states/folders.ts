import { atom } from "nanostores";
import type { Folders } from "@webstudio-is/sdk";

export const $folders = atom<Folders>(new Map());
