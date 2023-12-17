import { Box, InputField, useId } from "@webstudio-is/design-system";
import {
  type ControlProps,
  getLabel,
  useLocalValue,
  ResponsiveLayout,
  Label,
} from "../shared";
import { VariablesButton } from "../variables";

// @todo:
//   use ColorPicker (need to refactor it first,
//   as it's currently tailored to work with styles only)

export const ColorControl = ({
  meta,
  prop,
  propName,
  deletable,
  readOnly,
  onChange,
  onDelete,
}: ControlProps<"color", "string">) => {
  const id = useId();

  const localValue = useLocalValue(prop?.value ?? "", (value) =>
    onChange({ type: "string", value })
  );

  return (
    <ResponsiveLayout
      label={
        <Box css={{ position: "relative" }}>
          <Label
            htmlFor={id}
            description={meta.description}
            readOnly={readOnly}
          >
            {getLabel(meta, propName)}
          </Label>
          <VariablesButton
            propId={prop?.id}
            propName={propName}
            propMeta={meta}
          />
        </Box>
      }
      deletable={deletable}
      onDelete={onDelete}
    >
      <InputField
        id={id}
        disabled={readOnly}
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
