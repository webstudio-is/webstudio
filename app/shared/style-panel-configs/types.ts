import type { StyleProperty, AppliesTo } from "@webstudio-is/sdk";

type BaseStyleConfig = {
  label: string;
  property: StyleProperty;
  appliesTo: AppliesTo;
};

export type UiType =
  | "Spacing"
  | "Select"
  | "ToggleGroup"
  | "TextFieldWithAutocomplete"
  | "ColorField";

type StyleConfigWithItems = BaseStyleConfig & {
  ui: UiType;
  items: Array<{ label: string; name: string }>;
};

export type StyleConfig = StyleConfigWithItems;
