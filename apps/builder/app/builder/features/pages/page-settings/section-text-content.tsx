import { useId } from "react";
import { useStore } from "@nanostores/react";
import { Grid, Label, Text, TextArea } from "@webstudio-is/design-system";
import { isLiteralExpression } from "@webstudio-is/sdk";
import {
  BindingControl,
  BindingPopover,
} from "~/builder/shared/binding-popover";
import { computeExpression } from "@webstudio-is/project-build/runtime";
import type {
  PageSettingsErrors,
  PageSettingsValues,
} from "@webstudio-is/project-build/runtime";
import { $pageRootScope } from "../page-utils";
import type { OnChange } from "./shared";

export const TextContentSection = ({
  values,
  errors,
  onChange,
}: {
  values: PageSettingsValues;
  errors: PageSettingsErrors;
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
