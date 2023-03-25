import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import { props } from "./__generated__/rich-text-link.props";
import { meta as linkMeta, propsMeta as propsLinkMeta } from "./link.ws";

const { category, ...linkMetaRest } = linkMeta;

export const meta: WsComponentMeta = {
  ...linkMetaRest,
  type: "rich-text-child",
  children: [],
};

export const propsMeta: WsComponentPropsMeta = {
  ...propsLinkMeta,
  props,
};
