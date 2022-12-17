import type { Instance, InstanceProps } from "@webstudio-is/react-sdk";
import type {
  CssRule,
  Style,
  StyleProperty,
  StyleValue,
  Breakpoint,
} from "@webstudio-is/css-data";

export type SelectedInstanceData = {
  id: Instance["id"];
  component: Instance["component"];
  cssRules: Array<CssRule>;
  browserStyle: Style;
  props?: InstanceProps;
};

export type HoveredInstanceData = {
  id: Instance["id"];
  component: Instance["component"];
};

type StyleUpdate =
  | {
      operation: "delete";
      property: StyleProperty;
    }
  | {
      operation: "set";
      property: StyleProperty;
      value: StyleValue;
    };

export type StyleUpdates = {
  id: Instance["id"];
  updates: Array<StyleUpdate>;
  breakpoint: Breakpoint;
};
