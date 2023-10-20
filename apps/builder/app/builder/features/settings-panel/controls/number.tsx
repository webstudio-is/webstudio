import { InputField, useId } from "@webstudio-is/design-system";
import {
  type ControlProps,
  getLabel,
  useLocalValue,
  ResponsiveLayout,
  Label,
} from "../shared";
import { useState } from "react";

export const NumberControl = ({
  meta,
  prop,
  propName,
  onChange,
  deletable,
  onDelete,
}: ControlProps<"number", "number">) => {
  const id = useId();

  const [isInvalid, setIsInvalid] = useState(false);
  const localValue = useLocalValue(prop ? prop.value : "", (value) => {
    if (typeof value === "number") {
      onChange({ type: "number", value });
    }
    if (value === "") {
      setIsInvalid(true);
    }
  });

  return (
    <ResponsiveLayout
      label={
        <Label htmlFor={id} description={meta.description}>
          {getLabel(meta, propName)}
        </Label>
      }
      deletable={deletable}
      onDelete={onDelete}
    >
      <InputField
        id={id}
        type="number"
        value={localValue.value}
        color={isInvalid ? "error" : undefined}
        onChange={({ target: { valueAsNumber, value } }) => {
          localValue.set(Number.isNaN(valueAsNumber) ? value : valueAsNumber);
          setIsInvalid(false);
        }}
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
