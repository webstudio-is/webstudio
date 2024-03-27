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
  OtherSection,
  BoxShadowsSection,
  ListItemSection,
  TransitionSection,
  FilterSection,
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
  | "other";

export type ControlProps = {
  property: StyleProperty;
  items?: Array<{ label: string; name: string }>;
  currentStyle: StyleInfo;
  setProperty: SetProperty;
  deleteProperty: DeleteProperty;
  disabled?: boolean;
};

export type RenderCategoryProps = {
  setProperty: SetProperty;
  deleteProperty: DeleteProperty;
  createBatchUpdate: CreateBatchUpdate;
  currentStyle: StyleInfo;
  category: Category;
};

export const sections: Map<
  Category,
  (props: RenderCategoryProps) => ReactNode
> = new Map([
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
  ["other", OtherSection],
]);
