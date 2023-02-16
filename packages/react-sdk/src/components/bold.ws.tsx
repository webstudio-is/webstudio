import { FontBoldIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-type";
import props from "./__generated__/bold.props.json";

export const meta: WsComponentMeta = {
  type: "rich-text-child",
  label: "Bold Text",
  Icon: FontBoldIcon,
};

export const propsMeta = {
  props,
} as WsComponentPropsMeta;
