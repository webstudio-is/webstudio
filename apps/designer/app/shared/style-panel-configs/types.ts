import type { StyleProperty, AppliesTo } from "@webstudio-is/react-sdk";

type BaseStyleConfig = {
  label: string;
  property: StyleProperty;
  appliesTo: AppliesTo;
};

export type Control = "Spacing" | "Combobox" | "Color";

type StyleConfigWithItems = BaseStyleConfig & {
  control: Control;
  items: Array<{ label: string; name: string }>;
};

export type StyleConfig = StyleConfigWithItems;
