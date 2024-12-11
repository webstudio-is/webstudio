import { ListItemIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { li } from "@webstudio-is/sdk/normalize.css";
import type { defaultTag } from "./list-item";
import { props } from "./__generated__/list-item.props";

const presetStyle = {
  li,
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  category: "general",
  type: "container",
  constraints: {
    // cannot use parent relation here
    // because list item can be put inside of collection or slot
    // perhaps can be eventually fixed with tag matchers
    relation: "ancestor",
    component: { $eq: "List" },
  },
  description: "Adds a new item to an existing list.",
  icon: ListItemIcon,
  states: defaultStates,
  presetStyle,
  order: 4,
  template: [
    {
      type: "instance",
      component: "ListItem",
      children: [
        {
          type: "text",
          value: "List Item text you can edit",
          placeholder: true,
        },
      ],
    },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["id", "className"],
};
