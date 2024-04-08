import type { StyleProperty } from "@webstudio-is/css-engine";
import {
  BorderWidthIndividualIcon,
  BorderWidthTopIcon,
  BorderWidthRightIcon,
  BorderWidthBottomIcon,
  BorderWidthLeftIcon,
} from "@webstudio-is/icons";

import type { SectionProps } from "../shared/section";
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

export const BorderWidth = (
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
      label="Width"
      description="Sets the width of the border"
      borderPropertyOptions={borderPropertyOptions}
      individualModeIcon={<BorderWidthIndividualIcon />}
    />
  );
};
