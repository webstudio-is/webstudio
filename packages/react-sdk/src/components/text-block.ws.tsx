import { TextIcon } from "@webstudio-is/icons";
import type { WsComponentMeta } from "./component-type";
import { TextBlock } from "./text-block";

const defaultStyle = {
  minHeight: {
    type: "unit",
    unit: "em",
    value: 1,
  },
} as const;

const meta: WsComponentMeta<typeof TextBlock> = {
  type: "rich-text",
  label: "Text Block",
  Icon: TextIcon,
  Component: TextBlock,
  defaultStyle,
  children: ["Block of text you can edit"],
};

export default meta;
