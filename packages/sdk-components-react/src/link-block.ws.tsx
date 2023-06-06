import { LinkBlockIcon } from "@webstudio-is/icons/svg";
import type {
  PresetStyle,
  WsComponentMeta,
  WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { a } from "@webstudio-is/react-sdk/css-normalize";
import { props } from "./__generated__/link-block.props";
import { meta as linkMeta, propsMeta as linkPropsMeta } from "./link.ws";
import type { defaultTag } from "./link-block";

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
  label: "Link Block",
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
