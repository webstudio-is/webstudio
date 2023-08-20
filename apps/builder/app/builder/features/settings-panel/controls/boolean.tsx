import { Grid, Switch, theme, useId } from "@webstudio-is/design-system";
import {
  type ControlProps,
  getLabel,
  Label,
  RemovePropButton,
} from "../shared";

export const BooleanControl = ({
  meta,
  prop,
  propName,
  onChange,
  onDelete,
}: ControlProps<"boolean", "boolean">) => {
  const id = useId();

  return (
    <Grid
      css={{
        gridTemplateColumns: onDelete
          ? `1fr max-content max-content`
          : `1fr max-content`,
        minHeight: theme.spacing[13],
      }}
      align="center"
      gap="2"
    >
      <Label htmlFor={id}>{getLabel(meta, propName)}</Label>
      <Switch
        id={id}
        checked={prop?.value ?? false}
        onCheckedChange={(value) => onChange({ type: "boolean", value })}
      />
      {onDelete && <RemovePropButton onClick={onDelete} />}
    </Grid>
  );
};
