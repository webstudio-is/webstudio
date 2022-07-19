import { type Style, components } from "@webstudio-is/react-sdk";
export { SquareIcon as Icon } from "~/shared/icons";

// Webstudio specific default styles for the node type.
export const defaultStyle: Style = {
  boxSizing: {
    type: "keyword",
    value: "border-box",
  },
};

export const canAcceptChild = (): boolean => {
  return true;
};

export const isContentEditable = false;

// Can only be created from content editable fields
export const isInlineOnly = false;

export const Component = components.Box;

export const label = "Box";
