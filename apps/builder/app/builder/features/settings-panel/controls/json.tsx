import { theme, Box } from "@webstudio-is/design-system";
import {
  type ControlProps,
  getLabel,
  useLocalValue,
  VerticalLayout,
  Label,
} from "../shared";
import { VariablesButton } from "../variables";
import {
  ExpressionEditor,
  formatValue,
} from "~/builder/shared/expression-editor";

export const JsonControl = ({
  meta,
  prop,
  propName,
  deletable,
  readOnly,
  onChange,
  onDelete,
}: ControlProps<"json", "json">) => {
  const valueString = formatValue(prop?.value ?? "");
  const localValue = useLocalValue(valueString, (value) => {
    try {
      // wrap into parens to treat object expression as value instead of block
      const parsedValue = eval(`(${value})`);
      onChange({ type: "json", value: parsedValue });
    } catch {
      // empty block
    }
  });
  const label = getLabel(meta, propName);

  return (
    <VerticalLayout
      label={
        <Box css={{ position: "relative" }}>
          <Label description={meta.description} readOnly={readOnly}>
            {label}
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
      <Box css={{ py: theme.spacing[2] }}>
        <ExpressionEditor
          readOnly={readOnly}
          value={localValue.value}
          onChange={localValue.set}
          onBlur={localValue.save}
        />
      </Box>
    </VerticalLayout>
  );
};
