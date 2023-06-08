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
import { useState } from "react";

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
          onChange={(event) => {
            const value = event.target.value;
            localValue.set(value);
          }}
          onBlur={localValue.save}
          rows={rows ?? 1}
          onKeyDown={(event) => {
            if (event.key === "Enter" && event.metaKey) {
              localValue.save();
            }
          }}
        />
      </Flex>
    </VerticalLayout>
  );
};

const hasNewlines = (value: string) => /\n/.test(value);

const UniversalInput = ({
  value,
  onChange,
  rows,
  ...rest
}: {
  rows: number;
  value: string;
  onChange: (value: string) => void;
}) => {
  const localValue = useLocalValue(value, onChange);
  const [isMultiline, setIsMultiline] = useState(
    () => (rows !== undefined && rows > 1) || hasNewlines(value)
  );
  return (
    <TextArea
      {...rest}
      css={
        isMultiline
          ? { resize: "vertical" }
          : { resize: "none", whiteSpace: "nowrap" }
      }
      value={localValue.value}
      onChange={(event) => {
        const { value } = event.target;
        setIsMultiline(hasNewlines(value));
        localValue.set(value);
      }}
      onBlur={localValue.save}
      rows={rows ?? 1}
      onKeyDown={(event) => {
        // Single-line mode allows to submit with just Enter, without meta keys.
        if (event.key === "Enter") {
          if (isMultiline === false) {
            event.preventDefault();
          }
          const isModifier =
            event.shiftKey || event.metaKey || event.ctrlKey || event.altKey;
          // Insert the newline at the caret position.
          if (isModifier && isMultiline === false) {
            const element = event.currentTarget;
            if (element.selectionStart || element.selectionStart === 0) {
              const startPos = element.selectionStart;
              const endPos = element.selectionEnd;
              element.value =
                localValue.value.substring(0, startPos) +
                "\n" +
                localValue.value.substring(endPos, localValue.value.length);
              element.selectionStart = startPos + 1;
              element.selectionEnd = startPos + 1;
            } else {
              element.value = localValue.value + "\n";
            }
            localValue.set(element.value);
          }
          localValue.save();
        }
      }}
    />
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

  return (
    <VerticalLayout label={props.label} id={props.id} onDelete={onDelete}>
      <Flex css={{ py: theme.spacing[2] }}></Flex>
      <UniversalInput {...props} />
    </VerticalLayout>
  );

  return meta.rows === 0 ? (
    <AsInput {...props} />
  ) : (
    <AsTextarea {...props} rows={meta.rows ?? 1} />
  );
};
