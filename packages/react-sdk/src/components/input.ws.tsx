import { FormTextFieldIcon } from "@webstudio-is/icons";
import { input } from "../css/normalize";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "./component-meta";
import type { defaultTag } from "./input";
import { props } from "./__generated__/input.props";

const presetStyle = {
  input,
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  category: "forms",
  type: "control",
  label: "Text Input",
  Icon: FormTextFieldIcon,
  presetStyle,
  states: [
    ...defaultStates,
    { selector: "::placeholder", label: "Placeholder" },
    { selector: ":valid", label: "Valid" },
    { selector: ":invalid", label: "Invalid" },
    { selector: ":required", label: "Required" },
    { selector: ":optional", label: "Optional" },
    { selector: ":disabled", label: "Disabled" },
    { selector: ":enabled", label: "Enabled" },
    { selector: ":read-only", label: "Read Only" },
    { selector: ":read-write", label: "Read Write" },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["name", "type", "placeholder", "required", "autoFocus"],
};
