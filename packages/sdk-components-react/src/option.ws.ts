import { ItemIcon } from "@webstudio-is/icons/svg";
import {
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";

import type { defaultTag } from "./option";
import { props } from "./__generated__/option.props";

const presetStyle = {
  option: [
    {
      property: "backgroundColor",
      state: ":checked",
      value: {
        type: "rgb",
        alpha: 1,
        r: 209,
        g: 209,
        b: 209,
      },
    },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  category: "hidden",
  constraints: {
    relation: "parent",
    component: { $eq: "Select" },
  },
  type: "control",
  description:
    "An item within a drop-down menu that users can select as their chosen value.",
  icon: ItemIcon,
  presetStyle,
  states: [
    // Applies when option is being activated (clicked)
    { selector: ":active", label: "Active" },
    // Applies to the currently selected option
    { selector: ":checked", label: "Checked" },
    // For <option> elements: The :default pseudo-class selects the <option> that has the selected attribute when the page loads. This is true even if the user later selects a different option.
    { selector: ":default", label: "Default" },
    { selector: ":hover", label: "Hover" },
    { selector: ":disabled", label: "Disabled" },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["label", "selected", "value", "label", "disabled"],
};
