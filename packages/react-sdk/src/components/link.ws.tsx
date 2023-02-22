import { Link2Icon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-type";
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
  type: "rich-text",
  label: "Link",
  Icon: Link2Icon,
  presetStyle,
  children: ["Link text you can edit"],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["href"],
};
