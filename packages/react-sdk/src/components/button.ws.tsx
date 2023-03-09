import { ButtonIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-type";
import { props } from "./__generated__/button.props";

export const meta: WsComponentMeta = {
  type: "container",
  label: "Button",
  Icon: ButtonIcon,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["type", "innerText", "aria-label"],
};
