import { TextAlignLeftIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import { props } from "./__generated__/paragraph.props";

export const meta: WsComponentMeta = {
  category: "typography",
  type: "rich-text",
  label: "Paragraph",
  Icon: TextAlignLeftIcon,
  children: ["Pragraph you can edit"],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
};
