import type { PresetStyle, WsComponentMeta } from "@webstudio-is/sdk";
import { props } from "./__generated__/option.props";

const presetStyle = {
  option: [
    {
      property: "background-color",
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
} satisfies PresetStyle<"option">;

export const meta: WsComponentMeta = {
  category: "hidden",
  description:
    "An item within a drop-down menu that users can select as their chosen value.",
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
  initialProps: ["label", "value", "label", "disabled"],
  props,
};
