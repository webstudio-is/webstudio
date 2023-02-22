import {
  Text,
  Flex,
  Checkbox,
  Button,
  Label,
} from "@webstudio-is/design-system";
import { TrashIcon } from "@webstudio-is/icons";
import { type ControlProps, getLabel } from "../shared";

const add = (array: string[], item: string) => {
  if (array.includes(item)) {
    return array;
  }
  return [...array, item];
};

const remove = (array: string[], item: string) => {
  if (array.includes(item) === false) {
    return array;
  }
  return array.filter((arrayItem) => arrayItem !== item);
};

export const CheckControl = ({
  meta,
  prop,
  propName,
  onChange,
  onDelete,
}: ControlProps<"check" | "inline-check" | "multi-select", "string[]">) => {
  // @todo: handle the case when `value` contains something that isn't in `options`?

  const value = prop?.value ?? [];

  return (
    <div>
      <Label>{getLabel(meta, propName)}</Label>
      <Flex gap="1" justify="between">
        {meta.options.map((option) => (
          <Flex align="center" gap="1" key={option}>
            <Checkbox
              checked={value.includes(option)}
              onCheckedChange={(checked) => {
                onChange({
                  type: "string[]",
                  value: checked ? add(value, option) : remove(value, option),
                });
              }}
            />
            <Text>{value}</Text>
          </Flex>
        ))}
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
