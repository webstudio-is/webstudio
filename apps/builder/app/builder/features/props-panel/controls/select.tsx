import { Button, Select, Label, Flex } from "@webstudio-is/design-system";
import { TrashIcon } from "@webstudio-is/icons";
import { type ControlProps, getLabel } from "../shared";

export const SelectControl = ({
  meta,
  prop,
  propName,
  onChange,
  onDelete,
}: ControlProps<"select", "string">) => {
  // @todo: handle the case when `value` contains something that isn't in `options`?

  return (
    <div>
      <Label>{getLabel(meta, propName)}</Label>
      <Flex gap="1">
        <Select
          name={propName}
          value={prop?.value}
          options={meta.options}
          onChange={(value) => onChange({ type: "string", value })}
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
};
