import { LabelIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/sdk";
import { label } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/label.props";

const presetStyle = {
  label,
} satisfies PresetStyle<"label">;

export const meta: WsComponentMeta = {
  type: "container",
  icon: LabelIcon,
  presetStyle,
  states: defaultStates,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["id", "className", "htmlFor"],
};
