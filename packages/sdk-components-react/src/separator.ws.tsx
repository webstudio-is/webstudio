import { DashIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { hr } from "@webstudio-is/react-sdk/css-normalize";
import { props } from "./__generated__/separator.props";
import type { defaultTag } from "./separator";

const presetStyle = {
  hr: [
    ...hr,

    {
      property: "height",
      value: { type: "keyword", value: "1px" },
    },
    {
      property: "backgroundColor",
      value: { type: "keyword", value: "gray" },
    },
    {
      property: "borderTopStyle",
      value: { type: "keyword", value: "none" },
    },
    {
      property: "borderRightStyle",
      value: { type: "keyword", value: "none" },
    },
    {
      property: "borderLeftStyle",
      value: { type: "keyword", value: "none" },
    },
    {
      property: "borderBottomStyle",
      value: { type: "keyword", value: "none" },
    },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  category: "general",
  type: "embed",
  label: "Separator",
  description:
    "Used to visually divide sections of content, helping to improve readability and organization within a webpage.",
  icon: DashIcon,
  states: defaultStates,
  presetStyle,
  order: 5,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["id"],
};
