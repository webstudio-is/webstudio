import { LinkBlockIcon } from "@webstudio-is/icons/svg";
import type {
  PresetStyle,
  WsComponentMeta,
  WsComponentPropsMeta,
} from "./component-meta";
import { props } from "./__generated__/block-link.props";
import { meta as linkMeta, propsMeta as linkPropsMeta } from "./text-link.ws";
import type { defaultTag } from "./block-link";
import { a } from "../css/normalize";

const presetStyle = {
  a: [
    ...a,
    {
      property: "display",
      value: { type: "keyword", value: "inline-block" },
    },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  category: "general",
  type: "container",
  label: "Block Link",
  icon: LinkBlockIcon,
  states: linkMeta.states,
  presetStyle,
  order: 2,
};

export const propsMeta: WsComponentPropsMeta = {
  props: {
    ...props,
    href: linkPropsMeta.props.href,
  },
  initialProps: linkPropsMeta.initialProps,
};
