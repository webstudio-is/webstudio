import { BrushIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-type";
import props from "./__generated__/span.props.json";

export const meta: WsComponentMeta = {
  type: "rich-text-child",
  label: "Styled Text",
  Icon: BrushIcon,
};

export const propsMeta = {
  props,
} as WsComponentPropsMeta;
