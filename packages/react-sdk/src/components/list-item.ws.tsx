import { ListItemIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import { props } from "./__generated__/list-item.props";

export const meta: WsComponentMeta = {
  category: "typography",
  type: "rich-text",
  label: "List Item",
  Icon: ListItemIcon,
  children: ["List Item you can edit"],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
};
