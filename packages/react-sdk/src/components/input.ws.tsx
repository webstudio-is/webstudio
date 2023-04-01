import type { Style } from "@webstudio-is/css-data";
import { InputIcon } from "@webstudio-is/icons";
import { input } from "../css/normalize";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import type { defaultTag } from "./input";
import { props } from "./__generated__/input.props";

const presetStyle = {
  input,
} as const satisfies Record<typeof defaultTag, Style>;

export const meta: WsComponentMeta = {
  category: "forms",
  type: "control",
  label: "Input",
  Icon: InputIcon,
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
};
