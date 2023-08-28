const open =
  "Show or hide the content of this component on the canvas. This will not affect the initial state of the component.";

const alignOffset =
  "The offset in pixels from the “start“ or “end“ alignment options.";

const sideOffset =
  "The distance in pixels between the Content and the Trigger.";

const side =
  "The preferred alignment against the Trigger. May change when collisions occur.";

export const propsDescriptions = {
  Dialog: {
    open,
  },
  Sheet: {
    open,
  },
  Collapsible: {
    open,
  },
  Popover: {
    open,
  },
  PopoverContent: {
    alignOffset,
    sideOffset,
    side,
  },
  Tooltip: {
    open,
    delayDuration:
      "The delay before the Tooltip shows after the Trigger is hovered, in milliseconds. If no value is specified, the default is 700ms",
    disableHoverableContent:
      "When toggled, prevents the Tooltip content from showing when the Trigger is hovered.",
  },
  TooltipContent: {
    alignOffset,
    sideOffset,
    side,
  },
};
