import type { PropMeta } from "@webstudio-is/sdk";

export const propsTooltip: Record<string, PropMeta> = {
  delayDuration: {
    description:
      "The delay before the Tooltip shows after the Trigger is hovered, in milliseconds. If no value is specified, the default is 700ms",
    required: false,
    control: "number",
    type: "number",
  },
  disableHoverableContent: {
    description:
      "When toggled, prevents the Tooltip content from showing when the Trigger is hovered.",
    required: false,
    control: "boolean",
    type: "boolean",
  },
  open: {
    required: false,
    control: "boolean",
    type: "boolean",
    description:
      "Show or hide the content of this component on the canvas. This will not affect the initial state of the component.",
  },
};
export const propsTooltipTrigger: Record<string, PropMeta> = {};
export const propsTooltipContent: Record<string, PropMeta> = {
  align: {
    required: false,
    control: "radio",
    type: "string",
    options: ["center", "start", "end"],
  },
  alignOffset: {
    required: false,
    control: "number",
    type: "number",
    description:
      "The offset in pixels from the “start“ or “end“ alignment options.",
  },
  "aria-label": {
    description: "A more descriptive label for accessibility purpose",
    required: false,
    control: "text",
    type: "string",
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
