import type { PropMeta } from "@webstudio-is/sdk";

export const propsRadioGroup: Record<string, PropMeta> = {
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
  loop: {
    required: false,
    control: "boolean",
    type: "boolean",
    description:
      "Indicates whether the media should start playing from the start when it's finished.",
  },
  name: {
    required: false,
    control: "text",
    type: "string",
    description:
      "This name is important when submitting form data to the server, as it identifies the data associated with the input. When multiple inputs share the same name attribute, they are treated as part of the same group (e.g., radio buttons or checkboxes).",
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
export const propsRadioGroupItem: Record<string, PropMeta> = {
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
  value: {
    required: true,
    control: "text",
    type: "string",
    description:
      "Defines a default value which will be displayed in the element on pageload.",
  },
};
export const propsRadioGroupIndicator: Record<string, PropMeta> = {};
