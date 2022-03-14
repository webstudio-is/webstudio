import {
  type Instance,
  type InstanceProps,
  type Style,
  type StyleProperty,
  type StyleValue,
  type Tree,
} from "@webstudio-is/sdk";

export type SelectedInstanceData = {
  id: Instance["id"];
  component: Instance["component"];
  style: Style;
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
};
