import type { PropMeta } from "@webstudio-is/sdk";

export const propsNavigationMenu: Record<string, PropMeta> = {
  defaultValue: { required: false, control: "text", type: "string" },
  delayDuration: {
    description:
      "The duration from when the pointer enters the trigger until the tooltip gets opened.\n@defaultValue 200",
    required: false,
    control: "number",
    type: "number",
  },
  dir: {
    required: false,
    control: "radio",
    type: "string",
    options: ["ltr", "rtl"],
    description:
      "Defines the text direction. Allowed values are ltr (Left-To-Right) or rtl (Right-To-Left)",
  },
  skipDelayDuration: {
    description:
      "How much time a user has to enter another trigger without incurring a delay again.\n@defaultValue 300",
    required: false,
    control: "number",
    type: "number",
  },
  value: {
    required: false,
    control: "text",
    type: "string",
    description:
      "Defines a default value which will be displayed in the element on pageload.",
  },
};
export const propsNavigationMenuList: Record<string, PropMeta> = {};
export const propsNavigationMenuViewport: Record<string, PropMeta> = {};
export const propsNavigationMenuContent: Record<string, PropMeta> = {};
export const propsNavigationMenuItem: Record<string, PropMeta> = {
  value: {
    required: false,
    control: "text",
    type: "string",
    description:
      "Defines a default value which will be displayed in the element on pageload.",
  },
};
export const propsNavigationMenuLink: Record<string, PropMeta> = {
  active: { required: false, control: "boolean", type: "boolean" },
};
export const propsNavigationMenuTrigger: Record<string, PropMeta> = {};
