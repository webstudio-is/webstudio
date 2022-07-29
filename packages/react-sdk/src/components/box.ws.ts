import { SquareIcon } from "@webstudio-is/icons";
import type { WsComponentMeta } from "./component-type";
import { Box } from "./box";

const defaultStyle = {
  boxSizing: {
    type: "keyword",
    value: "border-box",
  },
};

export default {
  Icon: SquareIcon,
  Component: Box,
  defaultStyle,
  canAcceptChild: () => true,
  isContentEditable: false,
  isInlineOnly: false,
  isListed: true,
  label: "Box",
} as WsComponentMeta<typeof Box>;
