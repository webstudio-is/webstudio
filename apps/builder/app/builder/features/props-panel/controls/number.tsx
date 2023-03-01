import { TextField, useId } from "@webstudio-is/design-system";
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
}: ControlProps<"number", "number">) => {
  const id = useId();

  const localValue = useLocalValue(prop ? prop.value : "", (value) => {
    if (typeof value === "number") {
      onChange({ type: "number", value });
    }
  });

  return (
    <HorizontalLayout
      id={id}
      label={getLabel(meta, propName)}
      onDelete={onDelete}
    >
      <TextField
        id={id}
        type="number"
        value={localValue.value}
        onChange={(event) => {
          const asNumber = parseFloat(event.target.value);
          localValue.set(
            // just in case type="number" doesn't guarantee a number
            Number.isNaN(asNumber) ? event.target.value : asNumber
          );
        }}
        onBlur={localValue.save}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            localValue.save();
          }
        }}
        css={{ width: 98 }}
      />
    </HorizontalLayout>
  );
};
