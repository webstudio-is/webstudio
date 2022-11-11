import { SubscriptIcon } from "@webstudio-is/icons";
import type { WsComponentMeta } from "./component-type";
import { Subscript } from "./subscript";

const meta: WsComponentMeta<typeof Subscript> = {
  Icon: SubscriptIcon,
  Component: Subscript,
  canAcceptChildren: false,
  isContentEditable: false,
  label: "Subscript Text",
  isInlineOnly: true,
  isListed: false,
};

export default meta;
