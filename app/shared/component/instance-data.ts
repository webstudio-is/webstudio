import type { InstanceProps } from "~/shared/db";
import { type Instance } from "@webstudio-is/sdk";
import type { Style, StyleProperty, StyleValue } from "@webstudio-is/sdk";

export type SelectedInstanceData = {
  id: Instance["id"];
  component: Instance["component"];
  style: Style;
  browserStyle: Style;
  props: InstanceProps["props"];
};

type StyleUpdate = {
  property: StyleProperty;
  value: StyleValue;
};

export type StyleUpdates = {
  id: Instance["id"];
  updates: Array<StyleUpdate>;
};
