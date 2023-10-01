import { BlockquoteIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import type { defaultTag } from "./blockquote";
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
  category: "text",
  type: "container",
  label: "Blockquote",
  description:
    "Use to style a quote from an external source like an article or book.",
  icon: BlockquoteIcon,
  states: defaultStates,
  presetStyle,
  order: 3,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["id", "cite"],
};
