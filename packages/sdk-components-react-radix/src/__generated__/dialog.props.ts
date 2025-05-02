import type { PropMeta } from "@webstudio-is/sdk";

export const propsDialog: Record<string, PropMeta> = {
  open: {
    required: false,
    control: "boolean",
    type: "boolean",
    description:
      "Show or hide the content of this component on the canvas. This will not affect the initial state of the component.",
  },
};
export const propsDialogTrigger: Record<string, PropMeta> = {};
export const propsDialogOverlay: Record<string, PropMeta> = {};
export const propsDialogContent: Record<string, PropMeta> = {};
export const propsDialogClose: Record<string, PropMeta> = {};
export const propsDialogTitle: Record<string, PropMeta> = {
  tag: {
    required: false,
    control: "select",
    type: "string",
    options: ["h2", "h3", "h1", "h4", "h5", "h6"],
  },
};
export const propsDialogDescription: Record<string, PropMeta> = {};
