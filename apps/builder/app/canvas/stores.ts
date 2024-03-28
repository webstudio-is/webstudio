import { atom } from "nanostores";
import type { Instance, StyleDecl } from "@webstudio-is/sdk";
import type { Params } from "@webstudio-is/react-sdk";

export const $ephemeralStyles = atom<
  Array<StyleDecl & { instanceId: Instance["id"] }>
>([]);

export const $params = atom<undefined | Params>();
