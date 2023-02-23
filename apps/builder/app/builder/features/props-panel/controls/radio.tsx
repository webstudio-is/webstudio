import {
  Text,
  Flex,
  Button,
  RadioGroup,
  Radio,
  RadioAndLabel,
  Label,
} from "@webstudio-is/design-system";
import { TrashIcon } from "@webstudio-is/icons";
import { type ControlProps, getLabel } from "../shared";

export const RadioControl = ({
  meta,
  prop,
  propName,
  onChange,
  onDelete,
}: ControlProps<"radio" | "inline-radio", "string">) => {
  // @todo: handle the case when `value` contains something that isn't in `options`?

  return (
    <div>
      <Label>{getLabel(meta, propName)}</Label>
      <Flex gap="1" justify="between">
        <RadioGroup
          name="value"
          value={prop?.value}
          onValueChange={(value) => onChange({ type: "string", value })}
        >
          {meta.options.map((value) => (
            <RadioAndLabel key={value}>
              <Radio value={value} />
              <Text>{value}</Text>
            </RadioAndLabel>
          ))}
        </RadioGroup>
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
