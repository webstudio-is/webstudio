import type {
  WsComponentMeta,
  WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { meta as linkMeta, propsMeta as linkPropsMeta } from "./link.ws";

export const meta: WsComponentMeta = {
  ...linkMeta,
  category: "hidden",
  type: "rich-text-child",
  template: [],
};

export const propsMeta: WsComponentPropsMeta = linkPropsMeta;
