import type { StyleProperty } from "@webstudio-is/css-data";
import {
  BorderWidthIndividualIcon,
  BorderWidthTopIcon,
  BorderWidthRightIcon,
  BorderWidthBottomIcon,
  BorderWidthLeftIcon,
} from "@webstudio-is/icons";

import type { RenderCategoryProps } from "../../style-sections";
import { BorderProperty } from "./border-property";

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
    RenderCategoryProps,
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
      borderPropertyOptions={borderPropertyOptions}
      individualModeIcon={<BorderWidthIndividualIcon />}
    />
  );
};
