import {
  TextField,
  Flex,
  theme,
  useId,
  TextArea,
  Box,
} from "@webstudio-is/design-system";
import {
  type ControlProps,
  getLabel,
  RemovePropButton,
  Label,
  useLocalValue,
  DefaultControlLayout,
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
  const [localValue, setLocalValue] = useLocalValue(value);

  return (
    <Flex
      css={{ height: theme.spacing[13] }}
      justify="between"
      align="center"
      gap="2"
    >
      <Label htmlFor={id}>{label}</Label>
      <Flex align="center" gap="2">
        <TextField
          id={id}
          value={localValue}
          onChange={(event) => setLocalValue(event.target.value)}
          // @todo: shold we worry about unmout without blur and loosing the changes?
          onBlur={() => {
            if (localValue !== value) {
              onChange(localValue);
            }
          }}
          css={{ width: 120 }}
        />
        {onDelete && <RemovePropButton onClick={onDelete} />}
      </Flex>
    </Flex>
  );
};

const TEXTAREA_LINE_HEIGHT = 16;

const AsTextarea = ({
  label,
  id,
  value,
  onChange,
  onDelete,
  rows,
}: ImplementationProps & { rows: number }) => {
  const [localValue, setLocalValue] = useLocalValue(value);
  const height = rows * TEXTAREA_LINE_HEIGHT;

  return (
    <DefaultControlLayout label={label} id={id} onDelete={onDelete}>
      <Flex css={{ px: theme.spacing[2] }}>
        <TextArea
          id={id}
          value={localValue}
          onChange={(event) => setLocalValue(event.target.value)}
          // @todo: shold we worry about unmout without blur and loosing the changes?
          onBlur={() => {
            if (localValue !== value) {
              onChange(localValue);
            }
          }}
          css={{ flexGrow: 1, height, minHeight: height }}
        />
      </Flex>
    </DefaultControlLayout>
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
