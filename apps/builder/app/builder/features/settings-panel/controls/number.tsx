import { InputField, theme, useId } from "@webstudio-is/design-system";
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
      <InputField
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
        css={{ width: theme.spacing[21] }}
      />
    </HorizontalLayout>
  );
};
