import { FontItalicIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import { props } from "./__generated__/italic.props";

const presetStyle = {
  fontStyle: {
    type: "keyword",
    value: "italic",
  },
} as const;

export const meta: WsComponentMeta = {
  type: "rich-text-child",
  label: "Italic Text",
  Icon: FontItalicIcon,
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
};
