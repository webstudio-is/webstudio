import { type Style, components } from "@webstudio-is/sdk";
export { HeadingIcon as Icon } from "~/shared/icons";

// Webstudio specific default styles for the node type.
export const defaultStyle: Style = {
  minHeight: {
    type: "unit",
    unit: "em",
    value: 1,
  },
};

export const children = ["Heading you can edit"];

export const canAcceptChild = (): boolean => {
  return false;
};

export const isContentEditable = true;

// Can only be created from content editable fields
export const isInlineOnly = false;

export const label = "Heading";

export const Component = components.Heading;
