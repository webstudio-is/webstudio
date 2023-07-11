import { LinkIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { a } from "@webstudio-is/react-sdk/css-normalize";
import type { defaultTag } from "./link";
import { props } from "./__generated__/link.props";

const presetStyle = {
  a: [
    ...a,
    {
      property: "minHeight",
      value: { type: "unit", unit: "em", value: 1 },
    },
    {
      property: "display",
      value: { type: "keyword", value: "inline-block" },
    },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  category: "general",
  type: "container",
  label: "Link",
  icon: LinkIcon,
  presetStyle,
  order: 1,
  states: [
    ...defaultStates,
    {
      selector: ":visited",
      label: "Visited",
    },
    {
      category: "component-states",
      selector: "[aria-current=page]",
      label: "Current page",
    },
  ],
  template: [
    {
      type: "instance",
      component: "Link",
      children: [{ type: "text", value: "Link text you can edit" }],
    },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props: {
    ...props,
    href: {
      type: "string",
      control: "url",
      required: false,
    },
  },
  initialProps: ["id", "href", "target"],
};
