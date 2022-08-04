import { FontBoldIcon } from "@webstudio-is/icons";
import type { WsComponentMeta } from "./component-type";
import { Bold } from "./bold";

export default {
  Icon: FontBoldIcon,
  Component: Bold,
  canAcceptChild: () => false,
  isContentEditable: false,
  label: "Bold Text",
  isInlineOnly: true,
  isListed: false,
} as WsComponentMeta<typeof Bold>;
