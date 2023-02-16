import { TextIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-type";
import props from "./__generated__/text-block.props.json";

const presetStyle = {
  minHeight: {
    type: "unit",
    unit: "em",
    value: 1,
  },
} as const;

export const meta: WsComponentMeta = {
  type: "rich-text",
  label: "Text Block",
  Icon: TextIcon,
  presetStyle,
  children: ["Block of text you can edit"],
};

export const propsMeta = {
  props,
} as WsComponentPropsMeta;
