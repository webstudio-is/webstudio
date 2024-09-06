import type { StyleProperty } from "@webstudio-is/css-engine";
import {
  BorderWidthIndividualIcon,
  BorderWidthTopIcon,
  BorderWidthRightIcon,
  BorderWidthBottomIcon,
  BorderWidthLeftIcon,
} from "@webstudio-is/icons";
import { BorderProperty } from "./border-property";

export const properties = [
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
] satisfies Array<StyleProperty>;

const borderPropertyOptions = {
  borderTopWidth: {
    icon: <BorderWidthTopIcon />,
  },
  borderRightWidth: {
    icon: <BorderWidthRightIcon />,
  },
  borderLeftWidth: {
    icon: <BorderWidthLeftIcon />,
  },
  borderBottomWidth: {
    icon: <BorderWidthBottomIcon />,
  },
} as const satisfies Partial<{ [property in StyleProperty]: unknown }>;

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
