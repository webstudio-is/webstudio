import { useStore } from "@nanostores/react";
import { Grid, Switch, theme } from "@webstudio-is/design-system";
import {
  BindableExpressionControl,
  useBindingState,
} from "~/builder/shared/bindable-expression";
import { validatePrimitiveValue } from "@webstudio-is/project-build/runtime";
import {
  type ControlProps,
  $selectedInstanceScope,
  humanizeAttribute,
} from "../shared";
import { PropertyLabel } from "../property-label";

export const BooleanControl = ({
  meta,
  prop,
  propName,
  computedValue,
  onChange,
}: ControlProps<"boolean">) => {
  const label = humanizeAttribute(meta.label || propName);
  const { scope, aliases } = useStore($selectedInstanceScope);
  const expression =
    prop?.type === "expression" ? prop.value : JSON.stringify(computedValue);
  const { overwritable } = useBindingState(
    prop?.type === "expression" ? prop.value : undefined
  );

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
      <PropertyLabel name={propName} readOnly={overwritable === false} />
      <BindableExpressionControl
        expression={expression}
        value={Boolean(computedValue ?? false)}
        bound={prop?.type === "expression"}
        scope={scope}
        aliases={aliases}
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
