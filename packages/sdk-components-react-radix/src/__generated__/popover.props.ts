import type { PropMeta } from "@webstudio-is/sdk";

export const propsPopover: Record<string, PropMeta> = {
  open: {
    required: false,
    control: "boolean",
    type: "boolean",
    description:
      "Show or hide the content of this component on the canvas. This will not affect the initial state of the component.",
  },
};
export const propsPopoverTrigger: Record<string, PropMeta> = {};
export const propsPopoverContent: Record<string, PropMeta> = {
  align: {
    required: false,
    control: "radio",
    type: "string",
    defaultValue: "center",
    options: ["center", "start", "end"],
  },
  alignOffset: {
    required: false,
    control: "number",
    type: "number",
    description:
      "The offset in pixels from the “start“ or “end“ alignment options.",
  },
  arrowPadding: { required: false, control: "number", type: "number" },
  avoidCollisions: { required: false, control: "boolean", type: "boolean" },
  hideWhenDetached: {
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: true,
  },
  side: {
    required: false,
    control: "select",
    type: "string",
    options: ["top", "right", "bottom", "left"],
    description:
      "The preferred alignment against the Trigger. May change when collisions occur.",
  },
  sideOffset: {
    required: false,
    control: "number",
    type: "number",
    defaultValue: 4,
    description: "The distance in pixels between the Content and the Trigger.",
  },
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
export const propsPopoverClose: Record<string, PropMeta> = {};
