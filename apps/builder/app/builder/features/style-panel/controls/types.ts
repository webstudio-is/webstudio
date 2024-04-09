import type { StyleProperty } from "@webstudio-is/css-engine";
import type { StyleInfo } from "../shared/style-info";
import type { DeleteProperty, SetProperty } from "../shared/use-style-data";

export type ControlProps = {
  property: StyleProperty;
  items?: Array<{ label: string; name: string }>;
  currentStyle: StyleInfo;
  setProperty: SetProperty;
  deleteProperty: DeleteProperty;
  isAdvanced?: boolean;
};
