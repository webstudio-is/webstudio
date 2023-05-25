import { ListItemIcon } from "@webstudio-is/icons/svg";
import { li } from "../css/normalize";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
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
  icon: ListItemIcon,
  states: defaultStates,
  presetStyle,
  template: [
    {
      type: "instance",
      component: "ListItem",
      children: [{ type: "text", value: "List Item you can edit" }],
    },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
};
