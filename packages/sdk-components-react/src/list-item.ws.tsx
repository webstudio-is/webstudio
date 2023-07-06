import { ListItemIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { li } from "@webstudio-is/react-sdk/css-normalize";
import type { defaultTag } from "./list-item";
import { props } from "./__generated__/list-item.props";

const presetStyle = {
  li,
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  category: "general",
  type: "container",
  requiredAncestors: ["List"],
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
  order: 4,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["id"],
};
