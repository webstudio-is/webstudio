import { type Style, components } from "@webstudio-is/react-sdk";
export { ButtonIcon as Icon } from "@webstudio-is/icons";

// Webstudio specific default styles for the node type.
export const defaultStyle: Style = {};

export const canAcceptChild = (): boolean => {
  // @todo could accept an icon in the future
  return false;
};

export const isContentEditable = true;

// Can only be created from content editable fields
export const isInlineOnly = false;

export const children = ["Button text you can edit"];

export const Component = components.Button;

export const label = "Button";
