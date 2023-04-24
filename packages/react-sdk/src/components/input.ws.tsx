import type { Style } from "@webstudio-is/css-data";
import { FormTextFieldIcon } from "@webstudio-is/icons";
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
  Icon: FormTextFieldIcon,
  presetStyle,
  states: [
    { selector: "::placeholder", label: "Placeholder" },
    { selector: ":valid", label: "Valid" },
    { selector: ":invalid", label: "Invalid" },
    { selector: ":required", label: "Required" },
    { selector: ":checked", label: "Checked" },
    { selector: ":disabled", label: "Disabled" },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["name", "type", "placeholder", "required", "autoFocus"],
};
