import type { SelectedInstanceData } from "~/shared/component";
import type { Style } from "@webstudio-is/sdk";
import type { InheritedStyle } from "./get-inherited-style";
import type { SetProperty } from "./use-style-data";

export type SectionProps = {
  currentStyle: Style;
  inheritedStyle: InheritedStyle;
  setProperty: SetProperty;
  selectedInstanceData: SelectedInstanceData;
};
