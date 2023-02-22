import { ButtonIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-type";
import { props } from "./__generated__/button.props";

export const meta: WsComponentMeta = {
  type: "rich-text",
  label: "Button",
  Icon: ButtonIcon,
  children: ["Button text you can edit"],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["type"],
};
