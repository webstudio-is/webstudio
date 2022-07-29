import { FontItalicIcon } from "@webstudio-is/icons";
import type { WsComponentMeta } from "./component-type";
import { Italic } from "./italic";

export default {
  Icon: FontItalicIcon,
  Component: Italic,
  canAcceptChild: () => false,
  isContentEditable: false,
  isInlineOnly: true,
  label: "Italic Text",
  isListed: false,
} as WsComponentMeta<typeof Italic>;
