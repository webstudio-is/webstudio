import { BlockquoteIcon } from "@webstudio-is/icons/svg";
import type { defaultTag } from "./blockquote";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "./component-meta";
import { props } from "./__generated__/blockquote.props";

const presetStyle = {
  blockquote: [
    {
      property: "marginTop",
      value: { type: "unit", value: 0, unit: "number" },
    },
    {
      property: "marginRight",
      value: { type: "unit", value: 0, unit: "number" },
    },
    {
      property: "marginBottom",
      value: { type: "unit", value: 10, unit: "px" },
    },
    {
      property: "marginLeft",
      value: { type: "unit", value: 0, unit: "number" },
    },

    {
      property: "paddingTop",
      value: { type: "unit", value: 10, unit: "px" },
    },
    {
      property: "paddingBottom",
      value: { type: "unit", value: 10, unit: "px" },
    },
    {
      property: "paddingLeft",
      value: { type: "unit", value: 20, unit: "px" },
    },
    {
      property: "paddingRight",
      value: { type: "unit", value: 20, unit: "px" },
    },

    {
      property: "borderLeftWidth",
      value: { type: "unit", value: 5, unit: "px" },
    },
    {
      property: "borderLeftStyle",
      value: { type: "keyword", value: "solid" },
    },
    {
      property: "borderLeftColor",
      value: { type: "rgb", r: 226, g: 226, b: 226, alpha: 1 },
    },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  category: "typography",
  type: "rich-text",
  label: "Blockquote",
  icon: BlockquoteIcon,
  states: defaultStates,
  presetStyle,
  children: [{ type: "text", value: "Blockquote you can edit" }],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
};
