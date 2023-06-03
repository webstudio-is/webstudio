import type {
  WsComponentMeta,
  WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { props } from "./__generated__/rich-text-link.props";
import { meta as linkMeta, propsMeta as linkPropsMeta } from "./link.ws";

const { category, ...linkMetaRest } = linkMeta;

export const meta: WsComponentMeta = {
  ...linkMetaRest,
  type: "rich-text-child",
  template: [],
};

export const propsMeta: WsComponentPropsMeta = {
  initialProps: linkPropsMeta.initialProps,
  props: {
    ...props,
    href: linkPropsMeta.props.href,
  },
};
