import { ButtonIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import { props } from "./__generated__/button.props";

export const meta: WsComponentMeta = {
  category: "forms",
  type: "container",
  label: "Button",
  Icon: ButtonIcon,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["type", "innerText", "aria-label"],
};
