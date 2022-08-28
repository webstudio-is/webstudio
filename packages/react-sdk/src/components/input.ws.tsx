import { InputIcon } from "@webstudio-is/icons";
import type { WsComponentMeta } from "./component-type";
import { Input } from "./input";

const meta: WsComponentMeta<typeof Input> = {
  Icon: InputIcon,
  Component: Input,
  canAcceptChildren: false,
  isContentEditable: false,
  isInlineOnly: false,
  isListed: true,
  label: "Input",
};

export default meta;
