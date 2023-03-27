import { InputIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import { props } from "./__generated__/input.props";

export const meta: WsComponentMeta = {
  category: "forms",
  type: "control",
  label: "Input",
  Icon: InputIcon,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
};
