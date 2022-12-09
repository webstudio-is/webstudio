import { Grid, type CSS } from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";
import type { StyleConfig } from "./shared/configs";
import type { Category } from "@webstudio-is/react-sdk";
import type { Style, StyleProperty } from "@webstudio-is/css-data";
import type { SetProperty, CreateBatchUpdate } from "./shared/use-style-data";
import type { InheritedStyle } from "./shared/get-inherited-style";
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

export type PropertyProps = {
  property: StyleProperty | StyleProperty[];
  label: string;
  css?: CSS;
};

export type ControlProps = {
  setProperty: SetProperty;
  currentStyle: Style;
  inheritedStyle: InheritedStyle;
  styleConfig: StyleConfig;
  category: Category;
};

export type RenderCategoryProps = {
  setProperty: SetProperty;
  createBatchUpdate: CreateBatchUpdate;
  currentStyle: Style;
  sectionStyle: {
    [Property in Required<keyof Style>]: RenderPropertyProps;
  };
  inheritedStyle: InheritedStyle;
  category: Category;
  styleConfigsByCategory: Array<RenderPropertyProps>;
  moreStyleConfigsByCategory: Array<RenderPropertyProps>;
};

export type RenderPropertyProps = {
  setProperty: SetProperty;
  currentStyle: Style;
  inheritedStyle: InheritedStyle;
  styleConfig: StyleConfig;
  category: Category;
};

export const renderProperty = ({
  currentStyle,
  inheritedStyle,
  setProperty,
  styleConfig,
  category,
}: RenderPropertyProps) => {
  const Control = controls[styleConfig.control];
  const { property } = styleConfig;
  if (!Control) {
    return null;
  }

  return (
    <Grid key={category + property} css={{ gridTemplateColumns: "4fr 6fr" }}>
      <PropertyName property={styleConfig.property} label={styleConfig.label} />
      <Control
        currentStyle={currentStyle}
        inheritedStyle={inheritedStyle}
        setProperty={setProperty}
        styleConfig={styleConfig}
        category={category}
      />
    </Grid>
  );
};

export const renderCategory = ({
  setProperty,
  createBatchUpdate,
  currentStyle,
  sectionStyle,
  inheritedStyle,
  category,
  styleConfigsByCategory,
  moreStyleConfigsByCategory,
}: RenderCategoryProps) => {
  const Section = sections[category];
  return (
    <Section
      setProperty={setProperty}
      createBatchUpdate={createBatchUpdate}
      currentStyle={currentStyle}
      sectionStyle={sectionStyle}
      inheritedStyle={inheritedStyle}
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
