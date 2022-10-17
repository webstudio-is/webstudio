import { Grid } from "@webstudio-is/design-system";
import type { StyleConfig } from "./shared/configs";
import {
  type Style,
  type StyleProperty,
  type Category,
  type CSS,
} from "@webstudio-is/react-sdk";
import type { SetProperty, CreateBatchUpdate } from "./shared/use-style-data";
import type { InheritedStyle } from "./shared/get-inherited-style";
import {
  ColorControl,
  TextControl,
  SelectControl,
  MenuControl,
  FontFamilyControl,
} from "./controls";
import { ShowMore } from "./shared/show-more";
import { LayoutSection, SpacingSection } from "./sections";
import { BackgroundImageControl } from "./controls/background-image/background-image-control";
import { PropertyName } from "./shared/property-name";

export type PropertyProps = {
  property: StyleProperty;
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
    [Property in keyof Style]-?: RenderPropertyProps;
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
  if (!Control) return null;

  return (
    <Grid key={category + property} css={{ gridTemplateColumns: "40% 60%" }}>
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
  const Category = sections[category];
  if (!Category) {
    return (
      <>
        {styleConfigsByCategory.map((entry) => renderProperty(entry))}
        <ShowMore
          styleConfigs={moreStyleConfigsByCategory.map((entry) =>
            renderProperty(entry)
          )}
        />
      </>
    );
  }

  return (
    <Category
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
      return (currentStyle.display?.value as string)?.includes("flex");
    case "gridChild":
      return (currentStyle.display?.value as string)?.includes("grid");
  }

  return true;
};

const sections: {
  [key: string]: (props: RenderCategoryProps) => JSX.Element | null;
} = {
  layout: LayoutSection,
  spacing: SpacingSection,
};

const controls: {
  [key: string]: (props: ControlProps) => JSX.Element | null;
} = {
  Menu: MenuControl,
  Text: TextControl,
  Color: ColorControl,
  Select: SelectControl,
  FontFamily: FontFamilyControl,
  Image: BackgroundImageControl,
};
