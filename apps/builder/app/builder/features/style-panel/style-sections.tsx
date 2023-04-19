import { Grid } from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";
import { styleConfigByName } from "./shared/configs";
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
} from "./sections";

export const categories = [
  "layout",
  "flexChild",
  "gridChild",
  "space",
  "size",
  "position",
  "typography",
  "backgrounds",
  "borders",
];

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

export type RenderPropertyProps = {
  property: StyleProperty;
  currentStyle: StyleInfo;
  setProperty: SetProperty;
  deleteProperty: DeleteProperty;
};

export const renderProperty = ({
  property,
  currentStyle,
  setProperty,
  deleteProperty,
}: RenderPropertyProps) => {
  const { label, control, items } = styleConfigByName(property);
  const Control = controls[control];
  if (!Control) {
    return null;
  }

  return (
    <Grid key={property} css={{ gridTemplateColumns: "4fr 6fr" }}>
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
  [Property in Category]: (props: RenderCategoryProps) => JSX.Element | null;
} = {
  layout: LayoutSection,
  flexChild: FlexChildSection,
  gridChild: GridChildSection,
  space: SpaceSection,
  size: SizeSection,
  position: PositionSection,
  typography: TypographySection,
  backgrounds: BackgroundsSection,
  borders: BordersSection,
};
