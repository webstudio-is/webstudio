import { SuperscriptIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-type";
import { props } from "./__generated__/superscript.props";

export const meta: WsComponentMeta = {
  type: "rich-text-child",
  label: "Superscript Text",
  Icon: SuperscriptIcon,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
};
