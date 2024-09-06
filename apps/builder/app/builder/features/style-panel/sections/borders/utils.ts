import { theme, type CSS } from "@webstudio-is/design-system";

export const rowCss: CSS = {
  // Our aim is to maintain consistent styling throughout the property and align
  // the input fields on the left-hand side
  // See ./border-property.tsx for more details
  gridTemplateColumns: `1fr ${theme.spacing[20]} ${theme.spacing[12]}`,
  gap: theme.spacing[5],
};
