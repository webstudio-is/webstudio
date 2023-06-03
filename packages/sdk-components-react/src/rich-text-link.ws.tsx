import type {
  WsComponentMeta,
  WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { meta as linkMeta, propsMeta as linkPropsMeta } from "./link.ws";

const { category, ...linkMetaRest } = linkMeta;

export const meta: WsComponentMeta = {
  ...linkMetaRest,
  type: "rich-text-child",
  template: [],
};

export const propsMeta: WsComponentPropsMeta = linkPropsMeta;
