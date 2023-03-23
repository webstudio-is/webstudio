import { Grid } from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";
import { styleConfigByName } from "./shared/configs";
import type { Category } from "@webstudio-is/react-sdk";
import type { Style, StyleProperty } from "@webstudio-is/css-data";
import type {
  SetProperty,
  DeleteProperty,
  CreateBatchUpdate,
} from "./shared/use-style-data";
import { PropertyName } from "./shared/property-name";
import type { StyleInfo } from "./shared/style-info";
import * as controls from "./controls";
import {
  LayoutSection,
  FlexChildSection,
  GridChildSection,
  SpaceSection,
  SizeSection,
  PositionSection,
  TypographySection,
  BackgroundsSection,
  BordersSection,
  EffectsSection,
  OtherSection,
  BackgroundsCollapsibleSection,
} from "./sections";
import type { CollapsibleSection } from "~/builder/shared/inspector/collapsible-section";

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
  styleConfigsByCategory: Array<RenderPropertyProps>;
  moreStyleConfigsByCategory: Array<RenderPropertyProps>;
};

export type RenderPropertyProps = {
  property: StyleProperty;
  currentStyle: StyleInfo;
  setProperty: SetProperty;
  deleteProperty: DeleteProperty;
  category: Category;
};

export const renderProperty = ({
  property,
  currentStyle,
  setProperty,
  deleteProperty,
  category,
}: RenderPropertyProps) => {
  const { label, control, items } = styleConfigByName[property];
  const Control = controls[control];
  if (!Control) {
    return null;
  }

  return (
    <Grid key={category + property} css={{ gridTemplateColumns: "4fr 6fr" }}>
      <PropertyName
        style={currentStyle}
        property={property}
        label={label}
        onReset={() => deleteProperty(property)}
      />
      <Control
        property={property}
        items={items}
        currentStyle={currentStyle}
        setProperty={setProperty}
        deleteProperty={deleteProperty}
      />
    </Grid>
  );
};

export const renderCategory = ({
  setProperty,
  deleteProperty,
  createBatchUpdate,
  currentStyle,
  category,
  styleConfigsByCategory,
  moreStyleConfigsByCategory,
}: RenderCategoryProps) => {
  const Section = sections[category].section;
  return (
    <Section
      setProperty={setProperty}
      deleteProperty={deleteProperty}
      createBatchUpdate={createBatchUpdate}
      currentStyle={currentStyle}
      category={category}
      styleConfigsByCategory={styleConfigsByCategory}
      moreStyleConfigsByCategory={moreStyleConfigsByCategory}
    />
  );
};

export const shouldRenderCategory = (
  { currentStyle, category }: RenderCategoryProps,
  parentStyle: Style
) => {
  switch (category) {
    case "flexChild":
      return toValue(parentStyle.display).includes("flex");
    case "gridChild":
      return toValue(currentStyle.display?.value).includes("grid");
  }

  return true;
};

export const sections: {
  [Property in Category]: {
    collapsibleSection?: typeof CollapsibleSection;
    section: (props: RenderCategoryProps) => JSX.Element | null;
  };
} = {
  layout: { section: LayoutSection },
  flexChild: { section: FlexChildSection },
  gridChild: { section: GridChildSection },
  space: { section: SpaceSection },
  size: { section: SizeSection },
  position: { section: PositionSection },
  typography: { section: TypographySection },
  backgrounds: {
    section: BackgroundsSection,
    collapsibleSection: BackgroundsCollapsibleSection,
  },
  borders: { section: BordersSection },
  effects: { section: EffectsSection },
  other: { section: OtherSection },
};
