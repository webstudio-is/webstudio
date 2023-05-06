import { BoldIcon } from "@webstudio-is/icons";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "./component-meta";
import { props } from "./__generated__/bold.props";
import { b } from "../css/normalize";
import type { defaultTag } from "./bold";

const presetStyle = {
  b,
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  type: "rich-text-child",
  label: "Bold Text",
  Icon: BoldIcon,
  states: defaultStates,
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
};
