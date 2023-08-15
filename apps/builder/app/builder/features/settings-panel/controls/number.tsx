import { InputField, useId } from "@webstudio-is/design-system";
import {
  type ControlProps,
  getLabel,
  useLocalValue,
  ResponsiveLayout,
  Label,
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
    <ResponsiveLayout
      label={
        <Label htmlFor={id} description={meta.description}>
          {getLabel(meta, propName)}
        </Label>
      }
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
      />
    </ResponsiveLayout>
  );
};
