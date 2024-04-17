import type { StyleProperty } from "@webstudio-is/css-engine";
import {
  BorderRadiusIndividualIcon,
  BorderRadiusBottomRightIcon,
  BorderRadiusTopLeftIcon,
  BorderRadiusTopRightIcon,
  BorderRadiusBottomLeftIcon,
} from "@webstudio-is/icons";
import type { SectionProps } from "../shared/section";
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

export const BorderRadius = (
  props: Pick<
    SectionProps,
    "currentStyle" | "setProperty" | "deleteProperty" | "createBatchUpdate"
  >
) => {
  return (
    <BorderProperty
      currentStyle={props.currentStyle}
      setProperty={props.setProperty}
      deleteProperty={props.deleteProperty}
      createBatchUpdate={props.createBatchUpdate}
      label="Radius"
      description="Sets the radius of border"
      borderPropertyOptions={borderPropertyOptions}
      individualModeIcon={<BorderRadiusIndividualIcon />}
    />
  );
};
