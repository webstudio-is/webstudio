import { RadioCheckedIcon } from "@webstudio-is/icons/svg";
import {
  type WsComponentMeta,
  type WsComponentPropsMeta,
  type PresetStyle,
  defaultStates,
} from "@webstudio-is/sdk";
import type { defaultTag } from "./radio-button";
import { radio } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/radio-button.props";

const presetStyle = {
  input: [
    ...radio,
    {
      property: "margin-right",
      value: { type: "unit", unit: "em", value: 0.5 },
    },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  constraints: {
    relation: "ancestor",
    component: { $nin: ["Button", "Link"] },
  },
  type: "control",
  label: "Radio",
  icon: RadioCheckedIcon,
  presetStyle,
  states: [
    ...defaultStates,
    { selector: ":checked", label: "Checked" },
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
  initialProps: ["id", "className", "name", "value", "required", "checked"],
};
