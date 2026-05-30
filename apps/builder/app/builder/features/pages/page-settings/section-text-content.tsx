import { useId } from "react";
import { useStore } from "@nanostores/react";
import { Grid, Label, Text, TextArea } from "@webstudio-is/design-system";
import { isLiteralExpression } from "@webstudio-is/sdk";
import { z } from "zod";
import {
  BindingControl,
  BindingPopover,
} from "~/builder/shared/binding-popover";
import { computeExpression } from "~/shared/data-variables";
import { $pageRootScope } from "../page-utils";
import type { Errors, OnChange, Values } from "./shared";

const TextContentValues = z.object({
  content: z.string().optional(),
});

export const validateTextContentSection = (
  values: Values,
  variableValues: Map<string, unknown>
): Errors => {
  if (values.documentType !== "text") {
    return {};
  }

  const parsedResult = TextContentValues.safeParse({
    content: computeExpression(values.content, variableValues),
  });

  if (parsedResult.success === false) {
    return parsedResult.error.formErrors.fieldErrors;
  }

  return {};
};

export const TextContentSection = ({
  values,
  errors,
  onChange,
}: {
  values: Values;
  errors: Errors;
  onChange: OnChange;
}) => {
  const { variableValues, scope, aliases } = useStore($pageRootScope);
  const contentId = useId();

  return (
    <Grid gap={2}>
      <Text color="subtle">The plain text content served for this page.</Text>
      <Grid gap={1}>
        <Label htmlFor={contentId}>Text</Label>
        <BindingControl>
          <BindingPopover
            scope={scope}
            aliases={aliases}
            variant={isLiteralExpression(values.content) ? "default" : "bound"}
            value={values.content}
            onChange={(value) => {
              onChange({ field: "content", value });
            }}
            onRemove={(evaluatedValue) => {
              onChange({
                field: "content",
                value: JSON.stringify(evaluatedValue ?? ""),
              });
            }}
          />
          <TextArea
            id={contentId}
            color={errors.content ? "error" : undefined}
            disabled={isLiteralExpression(values.content) === false}
            value={String(
              computeExpression(values.content, variableValues) ?? ""
            )}
            onChange={(value) => {
              onChange({
                field: "content",
                value: JSON.stringify(value),
              });
            }}
            autoGrow
            maxRows={20}
          />
        </BindingControl>
      </Grid>
    </Grid>
  );
};
