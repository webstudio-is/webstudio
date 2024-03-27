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

// This controls the order of the sections in the style panel
export const categories = [
  "layout",
  "flexChild",
  "listItem",
  "space",
  "size",
  "position",
  "typography",
  "backgrounds",
  "borders",
  "boxShadows",
  "filter",
  "transitions",
  "outline",
  "others",
] as const;

export type Category = (typeof categories)[number];

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

export const renderCategory = ({
  setProperty,
  deleteProperty,
  createBatchUpdate,
  currentStyle,
  category,
}: RenderCategoryProps) => {
  const Section = sections[category];

  return (
    <Section
      setProperty={setProperty}
      deleteProperty={deleteProperty}
      createBatchUpdate={createBatchUpdate}
      currentStyle={currentStyle}
      category={category}
    />
  );
};

export const sections: Record<
  Category,
  (props: RenderCategoryProps) => JSX.Element | undefined
> = {
  layout: LayoutSection,
  flexChild: FlexChildSection,
  listItem: ListItemSection,
  space: SpaceSection,
  size: SizeSection,
  position: PositionSection,
  typography: TypographySection,
  backgrounds: BackgroundsSection,
  borders: BordersSection,
  boxShadows: BoxShadowsSection,
  filter: FilterSection,
  transitions: TransitionSection,
  outline: OutlineSection,
  others: OtherSection,
};
