import { Link2Icon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import { props } from "./__generated__/link.props";

const presetStyle = {
  minHeight: {
    type: "unit",
    unit: "em",
    value: 1,
  },
  display: {
    type: "keyword",
    value: "inline-block",
  },
} as const;

export const meta: WsComponentMeta = {
  category: "general",
  type: "rich-text",
  label: "Link Text",
  Icon: Link2Icon,
  presetStyle,
  children: ["Link text you can edit"],
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
