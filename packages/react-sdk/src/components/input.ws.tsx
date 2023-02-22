import { InputIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-type";
import { props } from "./__generated__/input.props";

export const meta: WsComponentMeta = {
  type: "control",
  label: "Input",
  Icon: InputIcon,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
};
