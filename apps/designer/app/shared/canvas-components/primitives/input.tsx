import { type Style, components } from "@webstudio-is/react-sdk";
export { InputIcon as Icon } from "@webstudio-is/icons";

// Webstudio specific default styles for the node type.
export const defaultStyle: Style = {};

export const canAcceptChild = (): boolean => {
  return false;
};

export const isContentEditable = false;

// Can only be created from content editable fields
export const isInlineOnly = false;

export const Component = components.Input;

// @todo we can't render label as a tag using psuedo elements for an input
// we either need to start rendering tags outside or wrap elements which can't have children
export const label = "Input";
