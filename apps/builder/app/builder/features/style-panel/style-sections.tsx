import type { ReactNode } from "react";
import type { StyleProperty } from "@webstudio-is/css-engine";
import type {
  SetProperty,
  DeleteProperty,
  CreateBatchUpdate,
} from "./shared/use-style-data";
import type { StyleInfo } from "./shared/style-info";
import {
  LayoutSection,
  FlexChildSection,
  SpaceSection,
  SizeSection,
  PositionSection,
  TypographySection,
  BackgroundsSection,
  BordersSection,
  OutlineSection,
  BoxShadowsSection,
  ListItemSection,
  TransitionSection,
  FilterSection,
  AdvancedSection,
} from "./sections";

export type Category =
  | "layout"
  | "flexChild"
  | "listItem"
  | "space"
  | "size"
  | "position"
  | "typography"
  | "backgrounds"
  | "borders"
  | "boxShadows"
  | "filter"
  | "transitions"
  | "outline"
  | "advanced";

export type ControlProps = {
  property: StyleProperty;
  items?: Array<{ label: string; name: string }>;
  currentStyle: StyleInfo;
  setProperty: SetProperty;
  deleteProperty: DeleteProperty;
  disabled?: boolean;
};

export type SectionProps = {
  setProperty: SetProperty;
  deleteProperty: DeleteProperty;
  createBatchUpdate: CreateBatchUpdate;
  currentStyle: StyleInfo;
};

export const sections: Map<Category, (props: SectionProps) => ReactNode> =
  new Map([
    ["layout", LayoutSection],
    ["flexChild", FlexChildSection],
    ["listItem", ListItemSection],
    ["space", SpaceSection],
    ["size", SizeSection],
    ["position", PositionSection],
    ["typography", TypographySection],
    ["backgrounds", BackgroundsSection],
    ["borders", BordersSection],
    ["boxShadows", BoxShadowsSection],
    ["filter", FilterSection],
    ["transitions", TransitionSection],
    ["outline", OutlineSection],
    ["advanced", AdvancedSection],
  ]);
