import { FontBoldIcon } from "@webstudio-is/icons";
import type { WsComponentMeta } from "./component-type";
import { Bold } from "./bold";

const meta: WsComponentMeta<typeof Bold> = {
  Icon: FontBoldIcon,
  Component: Bold,
  canAcceptChildren: false,
  isContentEditable: false,
  label: "Bold Text",
  isInlineOnly: true,
  isListed: false,
};

export default meta;
