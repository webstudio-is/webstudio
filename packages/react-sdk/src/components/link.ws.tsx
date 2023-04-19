import type { Style } from "@webstudio-is/css-data";
import { LinkIcon } from "@webstudio-is/icons";
import { a } from "../css/normalize";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import type { defaultTag } from "./link";
import { props } from "./__generated__/link.props";

const presetStyle = {
  a: {
    ...a,
    minHeight: {
      type: "unit",
      unit: "em",
      value: 1,
    },
    display: {
      type: "keyword",
      value: "inline-block",
    },
  },
} as const satisfies Record<typeof defaultTag, Style>;

export const meta: WsComponentMeta = {
  category: "general",
  type: "rich-text",
  label: "Link Text",
  Icon: LinkIcon,
  presetStyle,
  states: [{ selector: "[aria-current=page]", label: "Current page" }],
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
