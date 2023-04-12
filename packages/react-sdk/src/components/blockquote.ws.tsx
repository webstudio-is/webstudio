import type { Style } from "@webstudio-is/css-data";
import { BlockquoteIcon } from "@webstudio-is/icons";
import type { defaultTag } from "./blockquote";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import { props } from "./__generated__/blockquote.props";

const presetStyle = {
  blockquote: {
    marginTop: {
      type: "unit",
      value: 0,
      unit: "number",
    },
    marginRight: {
      type: "unit",
      value: 0,
      unit: "number",
    },
    marginBottom: {
      type: "unit",
      value: 10,
      unit: "px",
    },
    marginLeft: {
      type: "unit",
      value: 0,
      unit: "number",
    },

    paddingTop: {
      type: "unit",
      value: 10,
      unit: "px",
    },
    paddingBottom: {
      type: "unit",
      value: 10,
      unit: "px",
    },
    paddingLeft: {
      type: "unit",
      value: 20,
      unit: "px",
    },
    paddingRight: {
      type: "unit",
      value: 20,
      unit: "px",
    },

    borderLeftWidth: {
      type: "unit",
      value: 5,
      unit: "px",
    },
    borderLeftStyle: {
      type: "keyword",
      value: "solid",
    },

    borderLeftColor: {
      type: "rgb",
      r: 226,
      g: 226,
      b: 226,
      alpha: 1,
    },
  },
} as const satisfies Record<typeof defaultTag, Style>;

export const meta: WsComponentMeta = {
  category: "typography",
  type: "rich-text",
  label: "Blockquote",
  Icon: BlockquoteIcon,
  presetStyle,
  children: ["Blockquote you can edit"],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
};
