import { atom } from "nanostores";
import type { StyleDecl } from "@webstudio-is/sdk";

export const $ephemeralStyles = atom<Array<StyleDecl>>([]);
