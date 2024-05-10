import { atom } from "nanostores";
import type { StyleDecl } from "@webstudio-is/sdk";
import type { Params } from "@webstudio-is/react-sdk";

export const $ephemeralStyles = atom<Array<StyleDecl>>([]);

export const $params = atom<undefined | Params>();
