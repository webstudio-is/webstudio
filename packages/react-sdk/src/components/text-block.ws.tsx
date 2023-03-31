import { TextIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import { props } from "./__generated__/text-block.props";
import type { defaultTag } from "./text-block";
import type { Style } from "@webstudio-is/css-data";
import { div } from "../css/normalize";

const presetStyle = {
  div: {
    ...div,

    minHeight: {
      type: "unit",
      unit: "em",
      value: 1,
    },
  },
} as const satisfies Record<typeof defaultTag, Style>;

export const meta: WsComponentMeta = {
  category: "typography",
  type: "rich-text",
  label: "Text Block",
  Icon: TextIcon,
  presetStyle,
  children: ["Block of text you can edit"],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
};
