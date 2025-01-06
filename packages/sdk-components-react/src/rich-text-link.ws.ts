import type { WsComponentMeta, WsComponentPropsMeta } from "@webstudio-is/sdk";
import { meta as linkMeta, propsMeta as linkPropsMeta } from "./link.ws";

export const meta: WsComponentMeta = {
  ...linkMeta,
  type: "rich-text-child",
};

export const propsMeta: WsComponentPropsMeta = linkPropsMeta;
