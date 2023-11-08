import { Box, Grid, Switch, theme, useId } from "@webstudio-is/design-system";
import {
  type ControlProps,
  getLabel,
  Label,
  RemovePropButton,
} from "../shared";
import { VariablesButton } from "../variables";

export const BooleanControl = ({
  meta,
  prop,
  propName,
  deletable,
  onChange,
  onDelete,
}: ControlProps<"boolean", "boolean">) => {
  const id = useId();

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
      <Box css={{ position: "relative" }}>
        <Label htmlFor={id} description={meta.description}>
          {getLabel(meta, propName)}
        </Label>
        <VariablesButton prop={prop} propMeta={meta} onChange={onChange} />
      </Box>
      <Switch
        id={id}
        checked={prop?.value ?? false}
        onCheckedChange={(value) => onChange({ type: "boolean", value })}
      />
      {deletable && <RemovePropButton onClick={onDelete} />}
    </Grid>
  );
};
