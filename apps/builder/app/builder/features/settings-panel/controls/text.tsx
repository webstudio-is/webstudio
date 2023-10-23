import { Flex, theme, useId, TextArea } from "@webstudio-is/design-system";
import {
  type ControlProps,
  getLabel,
  useLocalValue,
  VerticalLayout,
  ResponsiveLayout,
  Label,
} from "../shared";
import { useState, type ComponentProps } from "react";

const countLines = (value: string) => (value.match(/\n/g) || "").length + 1;

type UniversalInputProps = Omit<
  ComponentProps<typeof TextArea>,
  "onChange" | "value" | "onSubmit"
> & {
  defaultRows?: number;
  maxRows?: number;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

/**
 * UniversalInput component allows to dynamically decide if we need a single-line input or a multi-line textarea.
 * Problem it is solving is that we don't know from data type string if user needs a textarea or an input.
 *
 * Single-line mode:
 * - enter saves
 * - shift+enter - adds newline and saves
 *
 * Multiline-mode:
 * - enter saves and ads newline
 * - cmd+enter - saves, no newline
 */
const UniversalInput = ({
  value,
  defaultRows,
  maxRows = 10,
  onChange,
  onSubmit,
  ...rest
}: UniversalInputProps) => {
  const [rows, setRows] = useState<number>(() =>
    Math.min(defaultRows || countLines(value), maxRows)
  );

  const handleChange = (value: string) => {
    setRows(Math.min(countLines(value), maxRows));
    onChange(value);
  };

  return (
    <TextArea
      {...rest}
      css={
        rows > 1
          ? { resize: "vertical" }
          : { resize: "none", whiteSpace: "nowrap", overflow: "hidden" }
      }
      value={value}
      onChange={(event) => {
        const { value } = event.target;
        handleChange(value);
      }}
      onBlur={(_event) => {
        handleChange(value);
        onSubmit();
      }}
      rows={rows}
      onKeyDown={(event) => {
        if (event.key !== "Enter") {
          return;
        }
        const isMultiline = rows > 1;
        if (isMultiline === false) {
          event.preventDefault();
        }
        // Insert the newline at the caret position.
        if (event.shiftKey && isMultiline === false) {
          const element = event.currentTarget;
          const startPos = element.selectionStart;
          const endPos = element.selectionEnd;
          element.value =
            value.substring(0, startPos) +
            "\n" +
            value.substring(endPos, value.length);
          element.selectionStart = startPos + 1;
          element.selectionEnd = startPos + 1;
          handleChange(element.value);
        }
        // Both single-line and multi-line inputs should submit on Enter.
        onSubmit();
      }}
    />
  );
};

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
    <UniversalInput
      id={id}
      value={localValue.value}
      defaultRows={meta.rows}
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
