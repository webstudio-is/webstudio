import type { PropMeta } from "@webstudio-is/sdk";

export const propsTabs: Record<string, PropMeta> = {
  activationMode: {
    description:
      "Whether a tab is activated automatically or manually.\n@defaultValue automatic",
    required: false,
    control: "radio",
    type: "string",
    options: ["automatic", "manual"],
  },
  defaultValue: {
    description: "The value of the tab to select by default, if uncontrolled",
    required: false,
    control: "text",
    type: "string",
  },
  dir: {
    description: "The direction of navigation between toolbar items.",
    required: false,
    control: "radio",
    type: "string",
    options: ["ltr", "rtl"],
  },
  orientation: {
    description:
      "The orientation the tabs are layed out.\nMainly so arrow navigation is done accordingly (left & right vs. up & down)\n@defaultValue horizontal",
    required: false,
    control: "radio",
    type: "string",
    options: ["horizontal", "vertical"],
  },
  value: {
    description: "The value for the selected tab, if controlled",
    required: false,
    control: "text",
    type: "string",
  },
};
export const propsTabsList: Record<string, PropMeta> = {
  loop: {
    required: false,
    control: "boolean",
    type: "boolean",
    description: "Whether to loop the media resource",
  },
};
export const propsTabsTrigger: Record<string, PropMeta> = {
  value: {
    required: false,
    control: "text",
    type: "string",
    description: "Current value of the element",
  },
};
export const propsTabsContent: Record<string, PropMeta> = {
  value: {
    required: false,
    control: "text",
    type: "string",
    description: "Current value of the element",
  },
};
