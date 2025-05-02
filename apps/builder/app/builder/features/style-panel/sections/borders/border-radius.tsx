import type { CssProperty } from "@webstudio-is/css-engine";
import {
  BorderRadiusIndividualIcon,
  BorderRadiusBottomRightIcon,
  BorderRadiusTopLeftIcon,
  BorderRadiusTopRightIcon,
  BorderRadiusBottomLeftIcon,
} from "@webstudio-is/icons";
import { BorderProperty } from "./border-property";

export const properties = [
  "border-top-left-radius",
  "border-top-right-radius",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
] satisfies Array<CssProperty>;

const borderPropertyOptions = {
  "border-top-left-radius": {
    icon: <BorderRadiusTopLeftIcon />,
  },
  "border-top-right-radius": {
    icon: <BorderRadiusTopRightIcon />,
  },
  "border-bottom-left-radius": {
    icon: <BorderRadiusBottomLeftIcon />,
  },
  "border-bottom-right-radius": {
    icon: <BorderRadiusBottomRightIcon />,
  },
} as const satisfies Partial<{ [property in CssProperty]: unknown }>;

export const BorderRadius = () => {
  return (
    <BorderProperty
      label="Radius"
      description="Sets the radius of border"
      borderPropertyOptions={borderPropertyOptions}
      individualModeIcon={<BorderRadiusIndividualIcon />}
    />
  );
};
