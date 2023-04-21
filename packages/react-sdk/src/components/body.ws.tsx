import { BodyIcon } from "@webstudio-is/icons";
import { body } from "../css/normalize";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import { props } from "./__generated__/body.props";
import type { defaultTag } from "./body";
import type { Style } from "@webstudio-is/css-data";

const presetStyle = {
  body: {
    ...body,

    minHeight: {
      type: "unit",
      unit: "%",
      value: 100,
    },

    fontFamily: {
      type: "keyword",
      value: "Arial",
    },

    fontSize: {
      type: "unit",
      unit: "px",
      value: 14,
    },

    lineHeight: {
      type: "unit",
      unit: "number",
      value: 1.5,
    },
  },
} as const satisfies Record<typeof defaultTag, Style>;

export const meta: WsComponentMeta = {
  type: "container",
  label: "Body",
  Icon: BodyIcon,
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
};
