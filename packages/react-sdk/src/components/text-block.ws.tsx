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
  Icon: TextIcon,
  Component: TextBlock,
  defaultStyle,
  canAcceptChildren: false,
  isContentEditable: true,
  isInlineOnly: false,
  isListed: true,
  label: "Text Block",
  children: ["Block of text you can edit"],
};

export default meta;
