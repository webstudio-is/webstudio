import { RadioCheckedIcon } from "@webstudio-is/icons/svg";
import {
  type WsComponentMeta,
  type WsComponentPropsMeta,
  type PresetStyle,
  defaultStates,
} from "@webstudio-is/react-sdk";
import type { defaultTag } from "./radio-button";
import { input } from "@webstudio-is/react-sdk/css-normalize";
import { props } from "./__generated__/radio-button.props";

const presetStyle = {
  input: [
    ...input,
    {
      property: "marginRight",
      value: { type: "unit", unit: "em", value: 0.5 },
    },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  category: "forms",
  type: "control",
  label: "Radio",
  icon: RadioCheckedIcon,
  presetStyle,
  order: 5,
  states: [
    ...defaultStates,
    { selector: ":checked", label: "Checked" },
    { selector: ":required", label: "Required" },
    { selector: ":optional", label: "Optional" },
    { selector: ":disabled", label: "Disabled" },
    { selector: ":enabled", label: "Enabled" },
    { selector: ":read-only", label: "Read Only" },
    { selector: ":read-write", label: "Read Write" },
  ],
  template: [
    {
      type: "instance",
      component: "Label",
      label: "Radio Field",
      children: [
        { type: "instance", component: "RadioButton", props: [], children: [] },
        {
          type: "instance",
          component: "Text",
          label: "Radio Label",
          props: [{ type: "string", name: "tag", value: "span" }],
          children: [{ type: "text", value: "Radio" }],
        },
      ],
    },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["id", "name"],
};
