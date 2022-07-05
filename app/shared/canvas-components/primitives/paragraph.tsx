import { type Style, components } from "@webstudio-is/sdk";
export { TextAlignLeftIcon as Icon } from "~/shared/icons";

// Webstudio specific default styles for the node type.
export const defaultStyle: Style = {};

export const children = ["Pragraph you can edit"];

export const canAcceptChild = (): boolean => {
  return false;
};

export const isContentEditable = true;

// Can only be created from content editable fields
export const isInlineOnly = false;

export const label = "Paragraph";

export const Component = components.Paragraph;
