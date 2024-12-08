import { CodeTextIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { code } from "@webstudio-is/sdk/normalize.css";
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
      property: "whiteSpaceCollapse",
      value: { type: "keyword", value: "preserve" },
    },
    {
      property: "textWrapMode",
      value: { type: "keyword", value: "wrap" },
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
  type: "embed",
  description:
    "Use this component when you want to display code as text on the page.",
  icon: CodeTextIcon,
  constraints: {
    relation: "ancestor",
    component: { $neq: "CodeText" },
  },
  states: defaultStates,
  presetStyle,
  order: 9,
};

export const propsMeta: WsComponentPropsMeta = {
  props: {
    ...props,
    code: {
      required: true,
      control: "codetext",
      type: "string",
    },
  },
  initialProps: ["id", "className", "lang", "code"],
};
