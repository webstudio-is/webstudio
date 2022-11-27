import { InputIcon } from "@webstudio-is/icons";
import type { WsComponentMeta } from "./component-type";
import { Input } from "./input";

const meta: WsComponentMeta<typeof Input> = {
  type: "control",
  label: "Input",
  Icon: InputIcon,
  Component: Input,
};

export default meta;
