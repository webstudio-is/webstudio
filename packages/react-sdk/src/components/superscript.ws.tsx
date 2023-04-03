import type { Style } from "@webstudio-is/css-data";
import { SuperscriptIcon } from "@webstudio-is/icons";
import { sup } from "../css/normalize";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import type { defaultTag } from "./superscript";
import { props } from "./__generated__/superscript.props";

const presetStyle = {
  sup,
} as const satisfies Record<typeof defaultTag, Style>;

export const meta: WsComponentMeta = {
  type: "rich-text-child",
  label: "Superscript Text",
  Icon: SuperscriptIcon,
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
};
