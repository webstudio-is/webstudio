import { TextAlignLeftIcon } from "@webstudio-is/icons";
import type { WsComponentMeta } from "./component-type";
import { Paragraph } from "./paragraph";

export default {
  Icon: TextAlignLeftIcon,
  Component: Paragraph,
  canAcceptChild: () => false,
  isContentEditable: true,
  isInlineOnly: false,
  isListed: true,
  label: "Paragraph",
  children: ["Pragraph you can edit"],
} as WsComponentMeta<typeof Paragraph>;
