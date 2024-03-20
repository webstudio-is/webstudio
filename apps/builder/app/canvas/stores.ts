import { atom } from "nanostores";
import type { Instance, StyleDecl } from "@webstudio-is/sdk";
import type { Params } from "@webstudio-is/react-sdk";

export const $ephemeralStyles = atom<
  Array<{
    instanceId: Instance["id"];
    breakpointId: StyleDecl["breakpointId"];
    state: StyleDecl["state"];
    styleSourceId: StyleDecl["styleSourceId"];
    property: StyleDecl["property"];
    value: StyleDecl["value"];
  }>
>([]);

export const $params = atom<undefined | Params>();
