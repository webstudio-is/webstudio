import { Flex, theme, useId, TextArea } from "@webstudio-is/design-system";
import {
  type ControlProps,
  getLabel,
  useLocalValue,
  VerticalLayout,
  ResponsiveLayout,
  Label,
} from "../shared";

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

  if (isTwoColumnLayout) {
    return (
      <ResponsiveLayout
        label={
          <Label htmlFor={id} description={meta.description}>
            {label}
          </Label>
        }
        deletable={deletable}
        onDelete={onDelete}
      >
        <Flex>{input}</Flex>
      </ResponsiveLayout>
    );
  }

  return (
    <VerticalLayout
      label={
        <Label htmlFor={id} description={meta.description}>
          {label}
        </Label>
      }
      deletable={deletable}
      onDelete={onDelete}
    >
      <Flex css={{ py: theme.spacing[2] }}>{input}</Flex>
    </VerticalLayout>
  );
};
