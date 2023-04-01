import { DashIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import { props } from "./__generated__/separator.props";
import type { defaultTag } from "./separator";
import type { Style } from "@webstudio-is/css-data";
import { hr } from "../css/normalize";

const presetStyle = {
  hr: {
    ...hr,

    height: {
      type: "keyword",
      value: "1px",
    },

    backgroundColor: {
      type: "keyword",
      value: "gray",
    },

    borderTopStyle: {
      type: "keyword",
      value: "none",
    },
    borderRightStyle: {
      type: "keyword",
      value: "none",
    },
    borderLeftStyle: {
      type: "keyword",
      value: "none",
    },
    borderBottomStyle: {
      type: "keyword",
      value: "none",
    },
  },
} as const satisfies Record<typeof defaultTag, Style>;

export const meta: WsComponentMeta = {
  category: "general",
  type: "embed",
  label: "Separator",
  Icon: DashIcon,
  presetStyle,
  children: [],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: [],
};
