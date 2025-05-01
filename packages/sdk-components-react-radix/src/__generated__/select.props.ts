import type { PropMeta } from "@webstudio-is/sdk";

export const propsSelect: Record<string, PropMeta> = {
  autoComplete: {
    required: false,
    control: "text",
    type: "string",
    description: "Hint for form autofill feature",
  },
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
  form: {
    required: false,
    control: "text",
    type: "string",
    description: "Associates the element with a form element",
  },
  name: {
    required: false,
    control: "text",
    type: "string",
    description:
      "Name of the element to use for form submission and in the form.elements API",
  },
  open: {
    required: false,
    control: "boolean",
    type: "boolean",
    description: "Whether the dialog box is showing",
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
export const propsSelectTrigger: Record<string, PropMeta> = {};
export const propsSelectValue: Record<string, PropMeta> = {
  placeholder: {
    required: false,
    control: "text",
    type: "string",
    description: "User-visible label to be placed within the form control",
  },
};
export const propsSelectContent: Record<string, PropMeta> = {
  align: {
    required: false,
    control: "radio",
    type: "string",
    options: ["center", "start", "end"],
  },
  alignOffset: { required: false, control: "number", type: "number" },
  arrowPadding: { required: false, control: "number", type: "number" },
  avoidCollisions: { required: false, control: "boolean", type: "boolean" },
  hideWhenDetached: { required: false, control: "boolean", type: "boolean" },
  sideOffset: { required: false, control: "number", type: "number" },
  sticky: {
    required: false,
    control: "radio",
    type: "string",
    options: ["partial", "always"],
  },
  updatePositionStrategy: {
    required: false,
    control: "radio",
    type: "string",
    options: ["always", "optimized"],
  },
};
export const propsSelectViewport: Record<string, PropMeta> = {
  nonce: {
    required: false,
    control: "text",
    type: "string",
    description:
      "Cryptographic nonce used in Content Security Policy checks [CSP]",
  },
};
export const propsSelectItem: Record<string, PropMeta> = {
  disabled: {
    required: false,
    control: "boolean",
    type: "boolean",
    description: "Whether the form control is disabled",
  },
  textValue: { required: false, control: "text", type: "string" },
  value: {
    required: true,
    control: "text",
    type: "string",
    description: "Current value of the element",
  },
};
export const propsSelectItemIndicator: Record<string, PropMeta> = {};
export const propsSelectItemText: Record<string, PropMeta> = {};
