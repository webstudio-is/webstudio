import { TrashIcon } from "@webstudio-is/icons";
import { TextField, Button, Label, Flex } from "@webstudio-is/design-system";
import { type ControlProps, getLabel } from "../shared";

export const ColorControl = ({
  meta,
  prop,
  propName,
  onChange,
  onDelete,
}: ControlProps<"color", "string">) => (
  <div>
    <Label>{getLabel(meta, propName)}</Label>
    <Flex gap="1">
      <TextField
        name={propName}
        value={prop?.value ?? ""}
        onChange={(event) => {
          onChange({ type: "string", value: event.target.value });
        }}
        css={{ flexGrow: 1 }}
      />
      {onDelete && (
        <Button
          color="ghost"
          prefix={<TrashIcon />}
          onClick={onDelete}
          css={{ flexShrink: 1 }}
        />
      )}
    </Flex>
  </div>
);
