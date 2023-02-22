import { TrashIcon } from "@webstudio-is/icons";
import { TextField, Button, Label, Flex } from "@webstudio-is/design-system";
import { type ControlProps, getLabel } from "../shared";

export const NumberControl = ({
  meta,
  prop,
  propName,
  onChange,
  onDelete,
}: ControlProps<"number", "number">) => (
  <div>
    <Label>{getLabel(meta, propName)}</Label>
    <Flex gap="1">
      <TextField
        type="number"
        name={propName}
        value={prop ? prop.value : ""}
        onChange={(event) => {
          onChange({ type: "number", value: parseFloat(event.target.value) });
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
