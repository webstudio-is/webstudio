import { type Instance, type Style, components } from "@webstudio-is/sdk";
export { Link2Icon as Icon } from "~/shared/icons";

// Webstudio specific default styles for the node type.
export const defaultStyle: Style = {
  minHeight: {
    type: "unit",
    unit: "em",
    value: 1,
  },
  display: {
    type: "keyword",
    value: "inline-block",
  },
};

export const children = ["Link text you can edit"];

export const canAcceptChild = (component: Instance["component"]): boolean => {
  return false;
};

export const isContentEditable = true;

// Can only be created from content editable fields
export const isInlineOnly = false;

export const label = "Link";

export const Component = components.Link;
