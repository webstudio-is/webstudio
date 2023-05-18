import { DashIcon } from "@webstudio-is/icons";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "./component-meta";
import { props } from "./__generated__/separator.props";
import type { defaultTag } from "./separator";
import { hr } from "../css/normalize";

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
  Icon: DashIcon,
  states: defaultStates,
  presetStyle,
  children: [],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: [],
};
