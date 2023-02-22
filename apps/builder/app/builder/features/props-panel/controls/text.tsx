import { TrashIcon } from "@webstudio-is/icons";
import { TextField, Label, Button, Flex } from "@webstudio-is/design-system";
import { type ControlProps, getLabel } from "../shared";

export const TextControl = ({
  meta,
  prop,
  propName,
  onChange,
  onDelete,
}: ControlProps<"text", "string">) => (
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
