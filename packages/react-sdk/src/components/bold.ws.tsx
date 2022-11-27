import { FontBoldIcon } from "@webstudio-is/icons";
import type { WsComponentMeta } from "./component-type";
import { Bold } from "./bold";

const meta: WsComponentMeta<typeof Bold> = {
  type: "rich-text-child",
  label: "Bold Text",
  Icon: FontBoldIcon,
  Component: Bold,
};

export default meta;
