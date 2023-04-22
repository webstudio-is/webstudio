import { CodeIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import { type defaultTag, displayVarNamespace } from "./code";
import { props } from "./__generated__/code.props";
import type { Style, StyleValue } from "@webstudio-is/css-data";
import { code } from "../css/normalize";

const display: StyleValue = {
  type: "var",
  value: displayVarNamespace,
  fallbacks: [
    {
      type: "keyword",
      value: "inline-block",
    },
  ],
};

const presetStyle = {
  code: {
    ...code,
    display,
    paddingLeft: {
      type: "unit",
      value: 0.2,
      unit: "em",
    },
    paddingRight: {
      type: "unit",
      value: 0.2,
      unit: "em",
    },
    backgroundColor: {
      type: "rgb",
      r: 238,
      g: 238,
      b: 238,
      alpha: 1,
    },
  },
} as const satisfies Record<typeof defaultTag, Style>;

export const meta: WsComponentMeta = {
  category: "general",
  type: "rich-text",
  label: "Code",
  Icon: CodeIcon,
  presetStyle,
  children: [{ type: "text", value: "Code you can edit" }],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["inline", "lang", "meta"],
};
