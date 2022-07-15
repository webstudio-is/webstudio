import {
  type Instance,
  type InstanceProps,
  type CssRule,
  type Style,
  type StyleProperty,
  type StyleValue,
  type Breakpoint,
} from "@webstudio-is/react-sdk";

export type SelectedInstanceData = {
  id: Instance["id"];
  component: Instance["component"];
  cssRules: Array<CssRule>;
  browserStyle: Style;
  props: InstanceProps;
};

export type HoveredInstanceData = {
  id: Instance["id"];
  component: Instance["component"];
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
