import { FontBoldIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import { props } from "./__generated__/bold.props";
import { b } from "../css/normalize";
import type { Style } from "@webstudio-is/css-data";
import type { defaultTag } from "./bold";

const presetStyle = {
  b,
} as const satisfies Record<typeof defaultTag, Style>;

export const meta: WsComponentMeta = {
  type: "rich-text-child",
  label: "Bold Text",
  Icon: FontBoldIcon,
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
};
