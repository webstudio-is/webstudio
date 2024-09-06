import type { StyleProperty } from "@webstudio-is/css-engine";
import {
  BorderRadiusIndividualIcon,
  BorderRadiusBottomRightIcon,
  BorderRadiusTopLeftIcon,
  BorderRadiusTopRightIcon,
  BorderRadiusBottomLeftIcon,
} from "@webstudio-is/icons";
import { BorderProperty } from "./border-property";

export const properties = [
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
] satisfies Array<StyleProperty>;

const borderPropertyOptions = {
  borderTopLeftRadius: {
    icon: <BorderRadiusTopLeftIcon />,
  },
  borderTopRightRadius: {
    icon: <BorderRadiusTopRightIcon />,
  },
  borderBottomLeftRadius: {
    icon: <BorderRadiusBottomLeftIcon />,
  },
  borderBottomRightRadius: {
    icon: <BorderRadiusBottomRightIcon />,
  },
} as const satisfies Partial<{ [property in StyleProperty]: unknown }>;

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
