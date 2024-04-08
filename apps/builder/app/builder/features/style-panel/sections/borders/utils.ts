import { theme, type CSS } from "@webstudio-is/design-system";
import { toValue, type StyleProperty } from "@webstudio-is/css-engine";
import type {
  CreateBatchUpdate,
  DeleteProperty,
  SetProperty,
} from "../../shared/use-style-data";
import type { StyleInfo } from "../../shared/style-info";

export const deleteAllProperties: (
  styleProperties: readonly StyleProperty[],
  createBatchUpdate: CreateBatchUpdate
) => DeleteProperty =
  (styleProperties, createBatchUpdate) => (_propertyName, options) => {
    const batch = createBatchUpdate();
    for (const property of styleProperties) {
      batch.deleteProperty(property);
    }
    batch.publish(options);
  };

export const setAllProperties: (
  styleProperties: readonly StyleProperty[],
  createBatchUpdate: CreateBatchUpdate
) => SetProperty =
  (styleProperties, createBatchUpdate) =>
  (_propertyName) =>
  (value, options) => {
    const batch = createBatchUpdate();
    for (const property of styleProperties) {
      batch.setProperty(property)(value);
    }
    batch.publish(options);
  };

export const rowCss: CSS = {
  // Our aim is to maintain consistent styling throughout the property and align
  // the input fields on the left-hand side
  // See ./border-property.tsx for more details
  gridTemplateColumns: `1fr ${theme.spacing[20]} ${theme.spacing[12]}`,
  gap: theme.spacing[5],
};

export const isAdvancedValue = (
  properties: Array<StyleProperty>,
  currentStyle: StyleInfo
) => {
  const values = properties.map((property) =>
    toValue(currentStyle[property]?.value)
  );

  // We can represent the value with a toggle group if all values are the same.
  return (
    values[0] !== values[1] ||
    values[0] !== values[2] ||
    values[0] !== values[3]
  );
};
