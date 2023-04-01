import { Flex, TextField, theme, useId } from "@webstudio-is/design-system";
import {
  type ControlProps,
  getLabel,
  useLocalValue,
  HorizontalLayout,
} from "../shared";

export const NumberControl = ({
  meta,
  prop,
  propName,
  onChange,
  onDelete,
  onSoftDelete,
}: ControlProps<"number", "number">) => {
  const id = useId();

  const localValue = useLocalValue(prop ? prop.value : "", (value) => {
    if (typeof value === "number") {
      onChange({ type: "number", value });
    }
    if (value === "") {
      onSoftDelete();
    }
  });

  return (
    <HorizontalLayout
      id={id}
      label={getLabel(meta, propName)}
      onDelete={onDelete}
    >
      <Flex
        css={{
          // can't set width on TextField because it adds padding
          width: theme.spacing[21],
        }}
      >
        <TextField
          id={id}
          type="number"
          value={localValue.value}
          onChange={({ target: { valueAsNumber, value } }) =>
            localValue.set(Number.isNaN(valueAsNumber) ? value : valueAsNumber)
          }
          onBlur={localValue.save}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              localValue.save();
            }
          }}
        />
      </Flex>
    </HorizontalLayout>
  );
};
