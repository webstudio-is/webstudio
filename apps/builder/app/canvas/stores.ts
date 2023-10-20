import { atom } from "nanostores";
import type { Instance, StyleDecl } from "@webstudio-is/sdk";

export const $ephemeralStyles = atom<
  Array<{
    instanceId: Instance["id"];
    breakpointId: StyleDecl["breakpointId"];
    state: StyleDecl["state"];
    property: StyleDecl["property"];
    value: StyleDecl["value"];
  }>
>([]);
