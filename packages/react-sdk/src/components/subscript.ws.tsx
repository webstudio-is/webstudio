import { SubscriptIcon } from "@webstudio-is/icons";
import type { WsComponentMeta } from "./component-type";
import { Subscript } from "./subscript";

const meta: WsComponentMeta<typeof Subscript> = {
  type: "rich-text-child",
  label: "Subscript Text",
  Icon: SubscriptIcon,
  Component: Subscript,
};

export default meta;
