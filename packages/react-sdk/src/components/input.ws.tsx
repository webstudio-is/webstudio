import { FormTextFieldIcon } from "@webstudio-is/icons";
import { input } from "../css/normalize";
import type {
  PresetStyle,
  WsComponentMeta,
  WsComponentPropsMeta,
} from "./component-meta";
import type { defaultTag } from "./input";
import { props } from "./__generated__/input.props";

const presetStyle = {
  input,
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  category: "forms",
  type: "control",
  label: "Input",
  Icon: FormTextFieldIcon,
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
};
