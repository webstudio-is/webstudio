import type { PropMeta } from "@webstudio-is/sdk";

export const propsSelect: Record<string, PropMeta> = {
  autoComplete: {
    required: false,
    control: "text",
    type: "string",
    description:
      "Indicates whether controls in this form can by default have their valuesautomatically completed by the browser.",
  },
  defaultValue: { required: false, control: "text", type: "string" },
  dir: {
    required: false,
    control: "radio",
    type: "string",
    options: ["ltr", "rtl"],
    description:
      "Defines the text direction. Allowed values are ltr (Left-To-Right) or rtl (Right-To-Left)",
  },
  disabled: {
    required: false,
    control: "boolean",
    type: "boolean",
    description: "Indicates whether the user can interact with the element.",
  },
  form: {
    required: false,
    control: "text",
    type: "string",
    description: "Indicates the form that is the owner of the element.",
  },
  name: {
    required: false,
    control: "text",
    type: "string",
    description:
      "This name is important when submitting form data to the server, as it identifies the data associated with the input. When multiple inputs share the same name attribute, they are treated as part of the same group (e.g., radio buttons or checkboxes).",
  },
  open: {
    required: false,
    control: "boolean",
    type: "boolean",
    description:
      "Indicates whether the contents are currently visible (in the case of a <details> element) or whether the dialog is active and can be interacted with (in the case of a <dialog> element).",
  },
  required: {
    required: false,
    control: "boolean",
    type: "boolean",
    description:
      "Indicates whether this form element must be filled before the form can be submitted.",
  },
  value: {
    required: false,
    control: "text",
    type: "string",
    description:
      "Defines a default value which will be displayed in the element on pageload.",
  },
};
export const propsSelectTrigger: Record<string, PropMeta> = {};
export const propsSelectValue: Record<string, PropMeta> = {
  placeholder: {
    required: false,
    control: "text",
    type: "string",
    description:
      "Provides a hint to the user of what can be entered in the field.",
  },
};
export const propsSelectContent: Record<string, PropMeta> = {
  align: {
    required: false,
    control: "radio",
    type: "string",
    options: ["center", "start", "end"],
    description: "Specifies the horizontal alignment of the element.",
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
  nonce: { required: false, control: "text", type: "string" },
};
export const propsSelectItem: Record<string, PropMeta> = {
  disabled: {
    required: false,
    control: "boolean",
    type: "boolean",
    description: "Indicates whether the user can interact with the element.",
  },
  textValue: { required: false, control: "text", type: "string" },
  value: {
    required: true,
    control: "text",
    type: "string",
    description:
      "Defines a default value which will be displayed in the element on pageload.",
  },
};
export const propsSelectItemIndicator: Record<string, PropMeta> = {};
export const propsSelectItemText: Record<string, PropMeta> = {};
