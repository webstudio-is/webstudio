import { SquareIcon } from "@webstudio-is/icons";
import type { WsComponentMeta } from "./component-type";
import { Box } from "./box";

const defaultStyle = {
  boxSizing: {
    type: "keyword",
    value: "border-box",
  },
} as const;

const meta: WsComponentMeta<typeof Box> = {
  Icon: SquareIcon,
  Component: Box,
  defaultStyle,
  canAcceptChildren: true,
  isContentEditable: false,
  isInlineOnly: false,
  isListed: true,
  label: "Box",
};

export default meta;
