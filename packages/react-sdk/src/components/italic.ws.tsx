import { FontBoldIcon } from "@webstudio-is/icons";
import type { WsComponentMeta } from "./component-type";
import { Italic } from "./italic";

export default {
  Icon: FontBoldIcon,
  Component: Italic,
  canAcceptChild: () => false,
  isContentEditable: false,
  isInlineOnly: true,
  label: "Italic Text",
} as WsComponentMeta<typeof Italic>;
