import { Flex, theme, useId, TextArea, Box } from "@webstudio-is/design-system";
import {
  type ControlProps,
  getLabel,
  useLocalValue,
  VerticalLayout,
  ResponsiveLayout,
  Label,
} from "../shared";
import { VariablesButton } from "../variables";

export const TextControl = ({
  meta,
  prop,
  propName,
  deletable,
  onChange,
  onDelete,
}: ControlProps<"text", "string">) => {
  const localValue = useLocalValue(prop?.value ?? "", (value) => {
    onChange({ type: "string", value });
  });
  const id = useId();
  const label = getLabel(meta, propName);
  const rows = meta.rows ?? 1;
  const isTwoColumnLayout = rows < 2;

  const input = (
    <TextArea
      id={id}
      autoGrow
      value={localValue.value}
      rows={meta.rows ?? 1}
      // Set maxRows to 3 when meta.rows is undefined or equal to 1, otherwise set it to rows * 2
      maxRows={Math.max(2 * (meta.rows ?? 1), 3)}
      onChange={localValue.set}
      onBlur={localValue.save}
      onSubmit={localValue.save}
    />
  );

  const labelElement = (
    <Box css={{ position: "relative" }}>
      <Label htmlFor={id} description={meta.description}>
        {label}
      </Label>
      <VariablesButton prop={prop} propMeta={meta} onChange={onChange} />
    </Box>
  );

  if (isTwoColumnLayout) {
    return (
      <ResponsiveLayout
        label={labelElement}
        deletable={deletable}
        onDelete={onDelete}
      >
        <Flex>{input}</Flex>
      </ResponsiveLayout>
    );
  }

  return (
    <VerticalLayout
      label={labelElement}
      deletable={deletable}
      onDelete={onDelete}
    >
      <Flex css={{ py: theme.spacing[2] }}>{input}</Flex>
    </VerticalLayout>
  );
};
