import { SuperscriptIcon } from "@webstudio-is/icons/svg";
import { sup } from "../css/normalize";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "./component-meta";
import type { defaultTag } from "./superscript";
import { props } from "./__generated__/superscript.props";

const presetStyle = {
  sup,
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  type: "rich-text-child",
  label: "Superscript Text",
  icon: SuperscriptIcon,
  states: defaultStates,
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
};
