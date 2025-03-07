import type { CssProperty } from "@webstudio-is/css-engine";
import {
  BorderWidthIndividualIcon,
  BorderWidthTopIcon,
  BorderWidthRightIcon,
  BorderWidthBottomIcon,
  BorderWidthLeftIcon,
} from "@webstudio-is/icons";
import { BorderProperty } from "./border-property";

export const properties = [
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
] satisfies CssProperty[];

const borderPropertyOptions = {
  "border-top-width": {
    icon: <BorderWidthTopIcon />,
  },
  "border-right-width": {
    icon: <BorderWidthRightIcon />,
  },
  "border-left-width": {
    icon: <BorderWidthLeftIcon />,
  },
  "border-bottom-width": {
    icon: <BorderWidthBottomIcon />,
  },
} as const satisfies Partial<{ [property in CssProperty]: unknown }>;

export const BorderWidth = () => {
  return (
    <BorderProperty
      label="Width"
      description="Sets the width of the border"
      borderPropertyOptions={borderPropertyOptions}
      individualModeIcon={<BorderWidthIndividualIcon />}
    />
  );
};
