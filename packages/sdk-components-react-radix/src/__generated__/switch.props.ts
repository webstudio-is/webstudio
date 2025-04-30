import type { PropMeta } from "@webstudio-is/sdk";

export const propsSwitch: Record<string, PropMeta> = {
  checked: {
    required: false,
    control: "boolean",
    type: "boolean",
    description:
      "Indicates whether the element should be checked on page load.",
  },
  required: {
    required: false,
    control: "boolean",
    type: "boolean",
    description:
      "Indicates whether this form element must be filled before the form can be submitted.",
  },
};
export const propsSwitchThumb: Record<string, PropMeta> = {};
