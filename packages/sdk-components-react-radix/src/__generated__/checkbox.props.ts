import type { PropMeta } from "@webstudio-is/sdk";

export const propsCheckbox: Record<string, PropMeta> = {
  checked: {
    required: false,
    control: "boolean",
    type: "boolean",
    description: "Whether the control is checked",
  },
  required: {
    required: false,
    control: "boolean",
    type: "boolean",
    description: "Whether the control is required for form submission",
  },
};
export const propsCheckboxIndicator: Record<string, PropMeta> = {};
