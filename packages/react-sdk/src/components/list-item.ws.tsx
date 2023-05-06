import { ListItemIcon } from "@webstudio-is/icons";
import { li } from "../css/normalize";
import type {
  PresetStyle,
  WsComponentMeta,
  WsComponentPropsMeta,
} from "./component-meta";
import type { defaultTag } from "./list-item";
import { props } from "./__generated__/list-item.props";

const presetStyle = {
  li,
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  category: "typography",
  type: "rich-text",
  acceptedParents: ["List"],
  label: "List Item",
  Icon: ListItemIcon,
  children: [{ type: "text", value: "List Item you can edit" }],
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
};
