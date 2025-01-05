import { FormTextFieldIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/sdk";
import { input } from "@webstudio-is/sdk/normalize.css";
import type { defaultTag } from "./input";
import { props } from "./__generated__/input.props";

const presetStyle = {
  input: [
    ...input,
    {
      property: "display",
      value: { type: "keyword", value: "block" },
    },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  category: "forms",
  constraints: {
    relation: "ancestor",
    component: { $nin: ["Button", "Link"] },
  },
  type: "control",
  label: "Text Input",
  description:
    "A single-line text input for collecting string data from your users.",
  icon: FormTextFieldIcon,
  presetStyle,
  order: 3,
  states: [
    ...defaultStates,
    { selector: "::placeholder", label: "Placeholder" },
    { selector: ":valid", label: "Valid" },
    { selector: ":invalid", label: "Invalid" },
    { selector: ":required", label: "Required" },
    { selector: ":optional", label: "Optional" },
    // Additional states will go into submenu
    //{ selector: ":disabled", label: "Disabled" },
    //{ selector: ":enabled", label: "Enabled" },
    //{ selector: ":read-only", label: "Read Only" },
    //{ selector: ":read-write", label: "Read Write" },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: [
    "id",
    "className",
    "name",
    "value",
    "type",
    "placeholder",
    "required",
    "autoFocus",
  ],
};
