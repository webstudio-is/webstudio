import { TextAlignLeftIcon } from "@webstudio-is/icons";
import type { WsComponentMeta } from "./component-type";
import { Paragraph } from "./paragraph";

const meta: WsComponentMeta<typeof Paragraph> = {
  Icon: TextAlignLeftIcon,
  Component: Paragraph,
  canAcceptChildren: false,
  isContentEditable: true,
  isInlineOnly: false,
  isListed: true,
  label: "Paragraph",
  children: ["Pragraph you can edit"],
};

export default meta;
