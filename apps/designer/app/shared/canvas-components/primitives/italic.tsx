import { components } from "@webstudio-is/sdk";
export { FontBoldIcon as Icon } from "apps/designer/app/shared/icons";

export const canAcceptChild = (): boolean => {
  return false;
};

export const isContentEditable = false;

export const label = "Italic Text";

// Can only be created from content editable fields
export const isInlineOnly = true;

export const Component = components.Italic;
