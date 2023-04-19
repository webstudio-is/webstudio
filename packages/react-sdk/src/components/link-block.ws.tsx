import { BoxLinkIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import { props } from "./__generated__/link-block.props";
import { meta as linkMeta, propsMeta as linkPropsMeta } from "./link.ws";
import type { defaultTag } from "./link-block";
import type { Style } from "@webstudio-is/css-data";
import { a } from "../css/normalize";

const presetStyle = {
  a: {
    ...a,
    display: {
      type: "keyword",
      value: "inline-block",
    },
  },
} as const satisfies Record<typeof defaultTag, Style>;

export const meta: WsComponentMeta = {
  category: "general",
  type: "container",
  label: "Link Block",
  Icon: BoxLinkIcon,
  states: linkMeta.states,
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props: {
    ...props,
    href: linkPropsMeta.props.href,
  },
  initialProps: linkPropsMeta.initialProps,
};
