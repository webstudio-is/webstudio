import type { htmlTags as HtmlTag } from "html-tags";
import { Grid } from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";
import type { StyleProperty } from "@webstudio-is/css-engine";
import { styleConfigByName } from "./shared/configs";
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
  OutlineSection,
  EffectsSection,
  BoxShadowsSection,
  ListItemSection,
} from "./sections";

export const categories = [
  "layout",
  "flexChild",
  "gridChild",
  "listItem",
  "space",
  "size",
  "position",
  "typography",
  "backgrounds",
  "borders",
  "boxShadows",
  "outline",
  "effects",
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
    <Grid key={property} css={{ gridTemplateColumns: "4fr 6fr" }} gap={2}>
      <PropertyName
        style={currentStyle}
        properties={[property]}
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
  parentStyle: StyleInfo,
  tag: undefined | HtmlTag
) => {
  switch (category) {
    case "flexChild":
      return toValue(parentStyle.display?.value).includes("flex");
    case "gridChild":
      return toValue(currentStyle.display?.value).includes("grid");
    case "listItem":
      return tag === "ul" || tag === "ol" || tag === "li";
  }

  return true;
};

export const sections: Record<
  Category,
  (props: RenderCategoryProps) => JSX.Element | null
> = {
  layout: LayoutSection,
  flexChild: FlexChildSection,
  gridChild: GridChildSection,
  listItem: ListItemSection,
  space: SpaceSection,
  size: SizeSection,
  position: PositionSection,
  typography: TypographySection,
  backgrounds: BackgroundsSection,
  borders: BordersSection,
  outline: OutlineSection,
  effects: EffectsSection,
  boxShadows: BoxShadowsSection,
};
