import { useStore } from "@nanostores/react";
import { Box, Grid, Switch, theme, useId } from "@webstudio-is/design-system";
import { BindingPopover } from "~/builder/shared/binding-popover";
import {
  type ControlProps,
  getLabel,
  Label,
  RemovePropButton,
  $selectedInstanceScope,
  updateExpressionValue,
} from "../shared";

export const BooleanControl = ({
  meta,
  prop,
  propName,
  computedValue,
  deletable,
  readOnly,
  onChange,
  onDelete,
}: ControlProps<"boolean", "boolean" | "expression">) => {
  const id = useId();
  const { scope, aliases } = useStore($selectedInstanceScope);
  const expression =
    prop?.type === "expression" ? prop.value : JSON.stringify(computedValue);

  return (
    <Grid
      css={{
        gridTemplateColumns: deletable
          ? `1fr max-content max-content`
          : `1fr max-content`,
        minHeight: theme.spacing[13],
        justifyItems: "start",
      }}
      align="center"
      gap="2"
    >
      <Label htmlFor={id} description={meta.description} readOnly={readOnly}>
        {getLabel(meta, propName)}
      </Label>
      <Box css={{ position: "relative" }}>
        <Switch
          id={id}
          disabled={readOnly}
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
          value={expression}
          onChange={(newExpression) =>
            onChange({ type: "expression", value: newExpression })
          }
          onRemove={(evaluatedValue) =>
            onChange({ type: "boolean", value: Boolean(evaluatedValue) })
          }
        />
      </Box>
      {deletable && <RemovePropButton onClick={onDelete} />}
    </Grid>
  );
};
