import { useId } from "react";
import { useStore } from "@nanostores/react";
import { Grid, Label, Text, TextArea } from "@webstudio-is/design-system";
import { isLiteralExpression } from "@webstudio-is/expression";
import { BindableExpressionControl } from "~/builder/shared/bindable-expression";
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
        <BindableExpressionControl
          expression={values.content}
          value={String(
            computeExpression(values.content, variableValues) ?? ""
          )}
          bound={isLiteralExpression(values.content) === false}
          allowBindingOverwrite={false}
          scope={scope}
          aliases={aliases}
          onChangeValue={(value) =>
            onChange({ field: "content", value: JSON.stringify(value) })
          }
          onChangeExpression={(value) => onChange({ field: "content", value })}
          onRemove={(value) =>
            onChange({
              field: "content",
              value: JSON.stringify(value ?? ""),
            })
          }
          renderControl={({ value, readOnly, onChangeValue }) => (
            <TextArea
              id={contentId}
              color={errors.content ? "error" : undefined}
              disabled={readOnly}
              value={value}
              onChange={onChangeValue}
              autoGrow
              maxRows={20}
            />
          )}
        />
      </Grid>
    </Grid>
  );
};
