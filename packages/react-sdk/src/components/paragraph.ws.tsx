import { TextAlignLeftIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-type";
import props from "./__generated__/paragraph.props.json";

export const meta: WsComponentMeta = {
  type: "rich-text",
  label: "Paragraph",
  Icon: TextAlignLeftIcon,
  children: ["Pragraph you can edit"],
};

export const propsMeta = {
  props,
} as WsComponentPropsMeta;
