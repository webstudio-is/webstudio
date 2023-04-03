import type { Style } from "@webstudio-is/css-data";
import { TextAlignLeftIcon } from "@webstudio-is/icons";
import { p } from "../css/normalize";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import type { defaultTag } from "./paragraph";
import { props } from "./__generated__/paragraph.props";

const presetStyle = {
  p,
} as const satisfies Record<typeof defaultTag, Style>;

export const meta: WsComponentMeta = {
  category: "typography",
  type: "rich-text",
  label: "Paragraph",
  Icon: TextAlignLeftIcon,
  children: ["Pragraph you can edit"],
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
};
