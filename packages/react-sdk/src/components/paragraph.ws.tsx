import { TextAlignLeftIcon } from "@webstudio-is/icons";
import { p } from "../css/normalize";
import type {
  PresetStyle,
  WsComponentMeta,
  WsComponentPropsMeta,
} from "./component-meta";
import type { defaultTag } from "./paragraph";
import { props } from "./__generated__/paragraph.props";

const presetStyle = {
  p,
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  category: "typography",
  type: "rich-text",
  label: "Paragraph",
  Icon: TextAlignLeftIcon,
  children: [{ type: "text", value: "Pragraph you can edit" }],
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
};
