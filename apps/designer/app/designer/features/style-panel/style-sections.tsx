import { Box } from "@webstudio-is/design-system";
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
  SpacingControl,
  ComboboxControl,
  SelectControl,
  IconButtonWithMenuControl,
  ShowMoreUtility,
} from "./controls";
import { LayoutSection } from "./sections";

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
  category: Category;
  styleConfigsByCategory: Array<JSX.Element | null>;
  moreStyleConfigsByCategory: Array<JSX.Element | null>;
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
    <Box
      key={category + property}
      data-control={styleConfig.control.toLowerCase()}
      data-property={property}
      css={{ gridArea: property }}
    >
      <Control
        currentStyle={currentStyle}
        inheritedStyle={inheritedStyle}
        setProperty={setProperty}
        styleConfig={styleConfig}
        category={category}
      />
    </Box>
  );
};

export const renderCategory = ({
  setProperty,
  createBatchUpdate,
  currentStyle,
  category,
  styleConfigsByCategory,
  moreStyleConfigsByCategory,
}: RenderCategoryProps) => {
  const Category = sections[category];
  if (!Category) {
    return (
      <>
        {styleConfigsByCategory}
        <ShowMoreUtility styleConfigs={moreStyleConfigsByCategory} />
      </>
    );
  }

  return (
    <Category
      setProperty={setProperty}
      createBatchUpdate={createBatchUpdate}
      currentStyle={currentStyle}
      category={category}
      styleConfigsByCategory={styleConfigsByCategory}
      moreStyleConfigsByCategory={moreStyleConfigsByCategory}
    />
  );
};

const sections: {
  [key: string]: (props: RenderCategoryProps) => JSX.Element | null;
} = {
  layout: LayoutSection,
};
const controls: {
  [key: string]: (props: ControlProps) => JSX.Element | null;
} = {
  Color: ColorControl,
  Spacing: SpacingControl,
  Combobox: ComboboxControl,
  IconButtonWithMenu: IconButtonWithMenuControl,
  Select: SelectControl,
};
