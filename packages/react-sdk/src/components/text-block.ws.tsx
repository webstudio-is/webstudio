import { TextIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import { props } from "./__generated__/text-block.props";

const presetStyle = {
  minHeight: {
    type: "unit",
    unit: "em",
    value: 1,
  },
} as const;

export const meta: WsComponentMeta = {
  category: "typography",
  type: "rich-text",
  label: "Text Block",
  Icon: TextIcon,
  presetStyle,
  children: ["Block of text you can edit"],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
};
