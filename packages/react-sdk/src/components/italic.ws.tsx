import { FontItalicIcon } from "@webstudio-is/icons";
import type { WsComponentMeta } from "./component-type";
import { Italic } from "./italic";

const meta: WsComponentMeta<typeof Italic> = {
  Icon: FontItalicIcon,
  Component: Italic,
  canAcceptChildren: false,
  isContentEditable: false,
  isInlineOnly: true,
  label: "Italic Text",
  isListed: false,
};

export default meta;
