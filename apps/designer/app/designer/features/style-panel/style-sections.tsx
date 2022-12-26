import { Grid } from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";
import type { StyleConfig } from "./shared/configs";
import type { Category } from "@webstudio-is/react-sdk";
import type { Style, StyleProperty } from "@webstudio-is/css-data";
import type {
  SetProperty,
  DeleteProperty,
  CreateBatchUpdate,
} from "./shared/use-style-data";
import * as controls from "./controls";
import {
  LayoutSection,
  FlexChildSection,
  GridChildSection,
  SpacingSection,
  SizeSection,
  PositionSection,
  TypographySection,
  BackgroundsSection,
  BordersSection,
  EffectsSection,
  OtherSection,
} from "./sections";
import { PropertyName } from "./shared/property-name";

export type ControlProps = {
  property: StyleProperty;
  setProperty: SetProperty;
  deleteProperty: DeleteProperty;
  currentStyle: Style;
  styleConfig: StyleConfig;
  category: Category;
};

export type RenderCategoryProps = {
  setProperty: SetProperty;
  deleteProperty: DeleteProperty;
  createBatchUpdate: CreateBatchUpdate;
  currentStyle: Style;
  sectionStyle: {
    [Property in Required<keyof Style>]: RenderPropertyProps;
  };
  category: Category;
  styleConfigsByCategory: Array<RenderPropertyProps>;
  moreStyleConfigsByCategory: Array<RenderPropertyProps>;
};

export type RenderPropertyProps = {
  property: StyleProperty;
  setProperty: SetProperty;
  deleteProperty: DeleteProperty;
  currentStyle: Style;
  styleConfig: StyleConfig;
  category: Category;
};

export const renderProperty = ({
  property,
  currentStyle,
  setProperty,
  deleteProperty,
  styleConfig,
  category,
}: RenderPropertyProps) => {
  const Control = controls[styleConfig.control];
  if (!Control) {
    return null;
  }

  return (
    <Grid key={category + property} css={{ gridTemplateColumns: "4fr 6fr" }}>
      <PropertyName
        property={property}
        label={styleConfig.label}
        onReset={() => deleteProperty(property)}
      />
      <Control
        property={property}
        currentStyle={currentStyle}
        setProperty={setProperty}
        deleteProperty={deleteProperty}
        styleConfig={styleConfig}
        category={category}
      />
    </Grid>
  );
};

export const renderCategory = ({
  setProperty,
  deleteProperty,
  createBatchUpdate,
  currentStyle,
  sectionStyle,
  category,
  styleConfigsByCategory,
  moreStyleConfigsByCategory,
}: RenderCategoryProps) => {
  const Section = sections[category];
  return (
    <Section
      setProperty={setProperty}
      deleteProperty={deleteProperty}
      createBatchUpdate={createBatchUpdate}
      currentStyle={currentStyle}
      sectionStyle={sectionStyle}
      category={category}
      styleConfigsByCategory={styleConfigsByCategory}
      moreStyleConfigsByCategory={moreStyleConfigsByCategory}
    />
  );
};

export const shouldRenderCategory = ({
  currentStyle,
  category,
}: RenderCategoryProps) => {
  switch (category) {
    case "flexChild":
      return toValue(currentStyle.display).includes("flex");
    case "gridChild":
      return toValue(currentStyle.display).includes("grid");
  }

  return true;
};

const sections: {
  [Property in Category]: (props: RenderCategoryProps) => JSX.Element | null;
} = {
  layout: LayoutSection,
  flexChild: FlexChildSection,
  gridChild: GridChildSection,
  spacing: SpacingSection,
  size: SizeSection,
  position: PositionSection,
  typography: TypographySection,
  backgrounds: BackgroundsSection,
  borders: BordersSection,
  effects: EffectsSection,
  other: OtherSection,
};
