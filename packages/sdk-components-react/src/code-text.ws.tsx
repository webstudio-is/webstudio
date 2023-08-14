import { CodeTextIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { code } from "@webstudio-is/react-sdk/css-normalize";
import type { defaultTag } from "./code-text";
import { props } from "./__generated__/code-text.props";

const presetStyle = {
  code: [
    ...code,
    {
      property: "display",
      value: { type: "keyword", value: "block" },
    },
    {
      property: "whiteSpace",
      value: { type: "keyword", value: "pre-wrap" },
    },
    {
      property: "paddingLeft",
      value: { type: "unit", value: 0.2, unit: "em" },
    },
    {
      property: "paddingRight",
      value: { type: "unit", value: 0.2, unit: "em" },
    },
    {
      property: "backgroundColor",
      value: { type: "rgb", r: 238, g: 238, b: 238, alpha: 1 },
    },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  category: "general",
  type: "container",
  label: "Code Text",
  icon: CodeTextIcon,
  states: defaultStates,
  presetStyle,
  template: [
    {
      type: "instance",
      component: "CodeText",
      children: [{ type: "text", value: "Code you can edit" }],
    },
  ],
  order: 8,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["id", "lang"],
};
