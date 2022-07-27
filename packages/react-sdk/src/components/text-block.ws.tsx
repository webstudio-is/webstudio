import { TextIcon } from "@webstudio-is/icons";
import type { WsComponentMeta } from "./component-type";
import { TextBlock } from "./text-block";

const defaultStyle = {
  minHeight: {
    type: "unit",
    unit: "em",
    value: 1,
  },
};

export default {
  Icon: TextIcon,
  Component: TextBlock,
  defaultStyle,
  canAcceptChild: () => false,
  isContentEditable: true,
  isInlineOnly: false,
  label: "Text Block",
  children: ["Block of text you can edit"],
} as WsComponentMeta<typeof TextBlock>;
