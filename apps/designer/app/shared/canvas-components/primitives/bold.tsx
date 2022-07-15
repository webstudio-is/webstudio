import { components } from "@webstudio-is/react-sdk";
export { FontBoldIcon as Icon } from "~/shared/icons";

export const canAcceptChild = (): boolean => {
  return false;
};

export const isContentEditable = false;

export const label = "Bold Text";

// Can only be created from content editable fields
export const isInlineOnly = true;

export const Component = components.Bold;
