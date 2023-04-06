import {
  InputField,
  Flex,
  theme,
  useId,
  TextArea,
} from "@webstudio-is/design-system";
import {
  type ControlProps,
  getLabel,
  useLocalValue,
  VerticalLayout,
  HorizontalLayout,
} from "../shared";

type ImplementationProps = {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  onDelete?: () => void;
};

const AsInput = ({
  label,
  id,
  value,
  onChange,
  onDelete,
}: ImplementationProps) => {
  const localValue = useLocalValue(value, onChange);

  return (
    <HorizontalLayout label={label} id={id} onDelete={onDelete}>
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
        css={{ width: theme.spacing[22] }}
      />
    </HorizontalLayout>
  );
};

const AsTextarea = ({
  label,
  id,
  value,
  onChange,
  onDelete,
  rows,
}: ImplementationProps & { rows: number }) => {
  const localValue = useLocalValue(value, onChange);

  return (
    <VerticalLayout label={label} id={id} onDelete={onDelete}>
      <Flex css={{ py: theme.spacing[2] }}>
        <TextArea
          id={id}
          value={localValue.value}
          onChange={(event) => localValue.set(event.target.value)}
          onBlur={localValue.save}
          rows={rows ?? 1}
        />
      </Flex>
    </VerticalLayout>
  );
};

export const TextControl = ({
  meta,
  prop,
  propName,
  onChange,
  onDelete,
}: ControlProps<"text", "string">) => {
  const props: ImplementationProps = {
    id: useId(),
    label: getLabel(meta, propName),
    value: prop?.value ?? "",
    onChange(value) {
      onChange({ type: "string", value });
    },
    onDelete,
  };

  return meta.rows === 0 ? (
    <AsInput {...props} />
  ) : (
    <AsTextarea {...props} rows={meta.rows ?? 1} />
  );
};
