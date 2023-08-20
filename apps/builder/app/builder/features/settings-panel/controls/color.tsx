import { InputField, useId } from "@webstudio-is/design-system";
import {
  type ControlProps,
  getLabel,
  useLocalValue,
  ResponsiveLayout,
} from "../shared";

// @todo:
//   use ColorPicker (need to refactor it first,
//   as it's currently tailored to work with styles only)

export const ColorControl = ({
  meta,
  prop,
  propName,
  onChange,
  onDelete,
}: ControlProps<"color", "string">) => {
  const id = useId();

  const localValue = useLocalValue(prop?.value ?? "", (value) =>
    onChange({ type: "string", value })
  );

  return (
    <ResponsiveLayout
      label={getLabel(meta, propName)}
      id={id}
      onDelete={onDelete}
    >
      <InputField
        id={id}
        value={localValue.value}
        onChange={(event) => localValue.set(event.target.value)}
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
