import { LinkIcon } from "@webstudio-is/icons";
import { a } from "../css/normalize";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "./component-meta";
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
  type: "rich-text",
  label: "Link Text",
  Icon: LinkIcon,
  presetStyle,
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
  children: [{ type: "text", value: "Link text you can edit" }],
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
  initialProps: ["href", "target", "prefetch"],
};
