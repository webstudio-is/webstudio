import {
  type Instance,
  type InstanceProps,
  type CssRule,
  type Style,
  type StyleProperty,
  type StyleValue,
  type Breakpoint,
} from "@webstudio-is/sdk";

export type SelectedInstanceData = {
  id: Instance["id"];
  component: Instance["component"];
  cssRules: Array<CssRule>;
  browserStyle: Style;
  props: InstanceProps;
};

type StyleUpdate = {
  property: StyleProperty;
  value: StyleValue;
};

export type StyleUpdates = {
  id: Instance["id"];
  updates: Array<StyleUpdate>;
  breakpoint: Breakpoint;
};
