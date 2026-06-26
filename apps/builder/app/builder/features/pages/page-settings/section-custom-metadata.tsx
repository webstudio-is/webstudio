import { z } from "zod";
import { InputErrorsTooltip } from "@webstudio-is/design-system";
import { CustomMetadata } from "../custom-metadata";
import { computeExpression } from "@webstudio-is/project-build/runtime/data";
import type { Errors, OnChange, Values } from "./shared";

const customMetadataValues = z.object({
  customMetas: z
    .array(
      z.object({
        property: z.string(),
        content: z.string(),
      })
    )
    .optional(),
});

export const validateCustomMetadataSection = (
  values: Values,
  variableValues: Map<string, unknown>
): Errors => {
  const parsedResult = customMetadataValues.safeParse({
    customMetas: values.customMetas.map((item) => ({
      property: item.property,
      content: computeExpression(item.content, variableValues),
    })),
  });
  return parsedResult.success ? {} : parsedResult.error.formErrors.fieldErrors;
};

export const CustomMetadataSection = ({
  values,
  errors,
  disabled,
  showBindingControls,
  onChange,
}: {
  values: Values;
  errors: Errors;
  disabled?: boolean;
  showBindingControls?: boolean;
  onChange: OnChange;
}) => {
  return (
    <InputErrorsTooltip errors={errors.customMetas}>
      <div role="group" aria-label="Custom metadata">
        <CustomMetadata
          customMetas={values.customMetas}
          disabled={disabled}
          showBindingControls={showBindingControls}
          onChange={(customMetas) => {
            onChange({
              field: "customMetas",
              value: customMetas,
            });
          }}
        />
      </div>
    </InputErrorsTooltip>
  );
};
