import { ListIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { ol, ul } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/list.props";
import type { ListTag } from "./list";

const presetStyle = {
  ol: [
    ...ol,
    {
      property: "marginTop",
      value: { type: "keyword", value: "0" },
    },
    {
      property: "marginBottom",
      value: { type: "keyword", value: "10px" },
    },
    {
      property: "paddingLeft",
      value: { type: "keyword", value: "40px" },
    },
  ],
  ul: [
    ...ul,
    {
      property: "marginTop",
      value: { type: "keyword", value: "0" },
    },
    {
      property: "marginBottom",
      value: { type: "keyword", value: "10px" },
    },
    {
      property: "paddingLeft",
      value: { type: "keyword", value: "40px" },
    },
  ],
} satisfies PresetStyle<ListTag>;

export const meta: WsComponentMeta = {
  category: "typography",
  type: "container",
  description: "Groups content, like links in a menu or steps in a recipe.",
  icon: ListIcon,
  states: defaultStates,
  presetStyle,
  order: 4,
  template: [
    {
      type: "instance",
      component: "List",
      children: [
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
    },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["id", "className", "ordered", "start", "reversed"],
};
