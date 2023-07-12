import { Switch, useId } from "@webstudio-is/design-system";
import { type ControlProps, getLabel, HorizontalLayout } from "../shared";

export const BooleanControl = ({
  meta,
  prop,
  propName,
  onChange,
  onDelete,
}: ControlProps<"boolean", "boolean">) => {
  const id = useId();

  return (
    <HorizontalLayout
      id={id}
      label={getLabel(meta, propName)}
      onDelete={onDelete}
    >
      <Switch
        id={id}
        checked={prop?.value ?? false}
        onCheckedChange={(value) => onChange({ type: "boolean", value })}
      />
    </HorizontalLayout>
  );
};
