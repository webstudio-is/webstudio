import type { PropMeta } from "@webstudio-is/sdk";

export const propsCollapsible: Record<string, PropMeta> = {
  disabled: {
    required: false,
    control: "boolean",
    type: "boolean",
    description: "Indicates whether the user can interact with the element.",
  },
  open: {
    required: false,
    control: "boolean",
    type: "boolean",
    description:
      "Show or hide the content of this component on the canvas. This will not affect the initial state of the component.",
  },
};
export const propsCollapsibleTrigger: Record<string, PropMeta> = {};
export const propsCollapsibleContent: Record<string, PropMeta> = {};
