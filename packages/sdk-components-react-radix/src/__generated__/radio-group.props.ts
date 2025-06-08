import type { PropMeta } from "@webstudio-is/sdk";

export const propsRadioGroup: Record<string, PropMeta> = {
  defaultValue: { required: false, control: "text", type: "string" },
  dir: {
    required: false,
    control: "radio",
    type: "string",
    options: ["ltr", "rtl"],
    description: "The text directionality of the element",
  },
  disabled: {
    required: false,
    control: "boolean",
    type: "boolean",
    description: "Whether the form control is disabled",
  },
  loop: {
    required: false,
    control: "boolean",
    type: "boolean",
    description: "Whether to loop the media resource",
  },
  name: {
    required: false,
    control: "text",
    type: "string",
    description:
      "Name of the element to use for form submission and in the form.elements API",
  },
  orientation: {
    required: false,
    control: "radio",
    type: "string",
    options: ["horizontal", "vertical"],
  },
  required: {
    required: false,
    control: "boolean",
    type: "boolean",
    description: "Whether the control is required for form submission",
  },
  value: {
    required: false,
    control: "text",
    type: "string",
    description: "Current value of the element",
  },
};
export const propsRadioGroupItem: Record<string, PropMeta> = {
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
  value: {
    required: true,
    control: "text",
    type: "string",
    description: "Current value of the element",
  },
};
export const propsRadioGroupIndicator: Record<string, PropMeta> = {};
