import type { PropMeta } from "@webstudio-is/sdk";

export const propsCollapsible: Record<string, PropMeta> = {
  disabled: {
    required: false,
    control: "boolean",
    type: "boolean",
    description: "Whether the form control is disabled",
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
export const propsCollapsibleContent: Record<string, PropMeta> = {
  forceMount: {
    description:
      "When true, closed content stays mounted. Keep an explicit closed-state CSS rule such as height: 0; Radix's animation-only example assumes unmounted content. Radix suppresses CSS transitions and animations while measuring height, so the first open may not animate.",
    required: false,
    control: "boolean",
    type: "boolean",
  },
};
