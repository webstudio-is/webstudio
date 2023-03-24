import type { WsComponentMeta, WsComponentPropsMeta } from "./component-type";
import { props } from "./__generated__/rich-text-link.props";
import { meta as linkMeta, propsMeta as linkPropsMeta } from "./link.ws";

export const meta: WsComponentMeta = {
  ...linkMeta,
  type: "rich-text-child",
  children: [],
};

export const propsMeta: WsComponentPropsMeta = {
  initialProps: linkPropsMeta.initialProps,
  props: {
    ...props,
    href: linkPropsMeta.props.href,
  },
};
