import { SuperscriptIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { sup } from "@webstudio-is/react-sdk/css-normalize";
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
  initialProps: ["id", "className"],
};
