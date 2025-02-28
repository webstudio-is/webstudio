import { BlockquoteIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/sdk";
import type { defaultTag } from "./blockquote";
import { props } from "./__generated__/blockquote.props";

const presetStyle = {
  blockquote: [
    {
      property: "margin-top",
      value: { type: "unit", value: 0, unit: "number" },
    },
    {
      property: "margin-right",
      value: { type: "unit", value: 0, unit: "number" },
    },
    {
      property: "margin-bottom",
      value: { type: "unit", value: 10, unit: "px" },
    },
    {
      property: "margin-left",
      value: { type: "unit", value: 0, unit: "number" },
    },

    {
      property: "padding-top",
      value: { type: "unit", value: 10, unit: "px" },
    },
    {
      property: "padding-bottom",
      value: { type: "unit", value: 10, unit: "px" },
    },
    {
      property: "padding-left",
      value: { type: "unit", value: 20, unit: "px" },
    },
    {
      property: "padding-right",
      value: { type: "unit", value: 20, unit: "px" },
    },

    {
      property: "border-left-width",
      value: { type: "unit", value: 5, unit: "px" },
    },
    {
      property: "border-left-style",
      value: { type: "keyword", value: "solid" },
    },
    {
      property: "border-left-color",
      value: { type: "rgb", r: 226, g: 226, b: 226, alpha: 1 },
    },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  type: "container",
  placeholder: "Blockquote",
  icon: BlockquoteIcon,
  states: defaultStates,
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["id", "className", "cite"],
};
