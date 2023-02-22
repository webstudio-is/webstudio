import { Button, Switch, Label, Flex } from "@webstudio-is/design-system";
import { TrashIcon } from "@webstudio-is/icons";
import { type ControlProps, getLabel } from "../shared";

export const BooleanControl = ({
  meta,
  prop,
  propName,
  onChange,
  onDelete,
}: ControlProps<"boolean", "boolean">) => (
  <div>
    <Label>{getLabel(meta, propName)}</Label>
    <Flex justify="between">
      <Switch
        name={propName}
        checked={prop?.value ?? false}
        onCheckedChange={(value) => onChange({ type: "boolean", value })}
      />
      {onDelete && (
        <Button color="ghost" prefix={<TrashIcon />} onClick={onDelete} />
      )}
    </Flex>
  </div>
);
