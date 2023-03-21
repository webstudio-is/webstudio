import type { StyleProperty } from "@webstudio-is/css-data";
import type { RenderCategoryProps } from "../../style-sections";
import { BorderProperty } from "./border-property";

const borderPropertyOptions = {
  borderTopStyle: {},
  borderRightStyle: {},
  borderLeftStyle: {},
  borderBottomStyle: {},
} as const satisfies Partial<{ [property in StyleProperty]: unknown }>;

export const BorderStyle = (
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
      label="Style"
      borderPropertyOptions={borderPropertyOptions}
    />
  );
};
