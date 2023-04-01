import type { Style } from "@webstudio-is/css-data";
import { FontItalicIcon } from "@webstudio-is/icons";
import type { defaultTag } from "./italic";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import { props } from "./__generated__/italic.props";
import { i } from "../css/normalize";

const presetStyle = {
  i: {
    ...i,
    fontStyle: {
      type: "keyword",
      value: "italic",
    },
  },
} as const satisfies Record<typeof defaultTag, Style>;

export const meta: WsComponentMeta = {
  type: "rich-text-child",
  label: "Italic Text",
  Icon: FontItalicIcon,
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
};
