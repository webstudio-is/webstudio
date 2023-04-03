import type { Style } from "@webstudio-is/css-data";
import { ListItemIcon } from "@webstudio-is/icons";
import { li } from "../css/normalize";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import type { defaultTag } from "./list-item";
import { props } from "./__generated__/list-item.props";

const presetStyle = {
  li,
} as const satisfies Record<typeof defaultTag, Style>;

export const meta: WsComponentMeta = {
  category: "typography",
  type: "rich-text",
  label: "List Item",
  Icon: ListItemIcon,
  children: ["List Item you can edit"],
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
};
