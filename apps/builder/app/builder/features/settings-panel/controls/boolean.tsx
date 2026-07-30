import { Grid, Switch, theme } from "@webstudio-is/design-system";
import { BindableExpressionControl } from "~/builder/shared/bindable-expression";
import { validatePrimitiveValue } from "@webstudio-is/project-build/runtime";
import { type ControlProps, humanizeAttribute } from "../shared";
import { PropertyLabel } from "../property-label";
import { useBindableControl } from "./use-bindable-control";

export const BooleanControl = ({
  meta,
  prop,
  propName,
  computedValue,
  onChange,
}: ControlProps<"boolean">) => {
  const label = humanizeAttribute(meta.label || propName);
  const binding = useBindableControl({
    boundExpression: prop?.type === "expression" ? prop.value : undefined,
    fallbackExpression: JSON.stringify(computedValue),
  });

  return (
    <Grid
      css={{
        gridTemplateColumns: `1fr max-content`,
        minHeight: theme.spacing[13],
        justifyItems: "start",
      }}
      align="center"
      gap="2"
    >
      <PropertyLabel
        name={propName}
        readOnly={binding.bindingState.overwritable === false}
      />
      <BindableExpressionControl
        {...binding}
        value={Boolean(computedValue ?? false)}
        validate={(value) => validatePrimitiveValue(value, label)}
        onChangeValue={(value) => onChange({ type: "boolean", value })}
        onChangeExpression={(value) => onChange({ type: "expression", value })}
        onRemove={(value) =>
          onChange({ type: "boolean", value: Boolean(value) })
        }
        renderControl={({ value, readOnly, onChangeValue }) => (
          <Switch
            disabled={readOnly}
            checked={value}
            onCheckedChange={onChangeValue}
          />
        )}
      />
    </Grid>
  );
};
