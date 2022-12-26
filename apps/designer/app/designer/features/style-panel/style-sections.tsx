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
  items?: Array<{ label: string; name: string }>;
  currentStyle: Style;
  setProperty: SetProperty;
  deleteProperty: DeleteProperty;
};

export type RenderCategoryProps = {
  setProperty: SetProperty;
  deleteProperty: DeleteProperty;
  createBatchUpdate: CreateBatchUpdate;
  currentStyle: Style;
  category: Category;
  styleConfigsByCategory: Array<RenderPropertyProps>;
  moreStyleConfigsByCategory: Array<RenderPropertyProps>;
};

export type RenderPropertyProps = {
  property: StyleProperty;
  currentStyle: Style;
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
  const Section = sections[category];
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
