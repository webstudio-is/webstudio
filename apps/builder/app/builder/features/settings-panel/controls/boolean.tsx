import { useStore } from "@nanostores/react";
import { Grid, Switch, theme } from "@webstudio-is/design-system";
import {
  BindingControl,
  BindingPopover,
} from "~/builder/shared/binding-popover";
import {
  type ControlProps,
  $selectedInstanceScope,
  updateExpressionValue,
  useBindingState,
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
  const { overwritable, variant } = useBindingState(
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
      <BindingControl>
        <Switch
          disabled={overwritable === false}
          checked={Boolean(computedValue ?? false)}
          onCheckedChange={(value) => {
            if (prop?.type === "expression") {
              updateExpressionValue(prop.value, value);
            } else {
              onChange({ type: "boolean", value });
            }
          }}
        />
        <BindingPopover
          scope={scope}
          aliases={aliases}
          validate={(value) => {
            if (value !== undefined && typeof value !== "boolean") {
              return `${label} expects a boolean value`;
            }
          }}
          variant={variant}
          value={expression}
          onChange={(newExpression) =>
            onChange({ type: "expression", value: newExpression })
          }
          onRemove={(evaluatedValue) =>
            onChange({ type: "boolean", value: Boolean(evaluatedValue) })
          }
        />
      </BindingControl>
    </Grid>
  );
};
