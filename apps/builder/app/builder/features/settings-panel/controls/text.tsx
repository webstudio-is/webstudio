import { useStore } from "@nanostores/react";
import { useId, TextArea } from "@webstudio-is/design-system";
import {
  BindingControl,
  BindingPopover,
} from "~/builder/shared/binding-popover";
import {
  type ControlProps,
  useLocalValue,
  VerticalLayout,
  ResponsiveLayout,
  Label,
  updateExpressionValue,
  $selectedInstanceScope,
  useBindingState,
} from "../shared";
import { useEffect, useRef } from "react";
import { humanizeString } from "~/shared/string-utils";

export const TextControl = ({
  meta,
  prop,
  propName,
  deletable,
  computedValue,
  autoFocus,
  onChange,
  onDelete,
}: ControlProps<"text">) => {
  const localValue = useLocalValue(String(computedValue ?? ""), (value) => {
    if (prop?.type === "expression") {
      updateExpressionValue(prop.value, value);
    } else {
      onChange({ type: "string", value });
    }
  });
  const id = useId();
  const label = humanizeString(meta.label || propName);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const rows = meta.rows ?? 1;
  const isTwoColumnLayout = rows < 2;

  const { scope, aliases } = useStore($selectedInstanceScope);
  const expression =
    prop?.type === "expression" ? prop.value : JSON.stringify(computedValue);
  const { overwritable, variant } = useBindingState(
    prop?.type === "expression" ? prop.value : undefined
  );

  useEffect(() => {
    if (autoFocus) {
      textAreaRef.current?.focus();
    }
  }, [autoFocus]);

  const input = (
    <BindingControl>
      <TextArea
        ref={textAreaRef}
        id={id}
        disabled={overwritable === false}
        autoGrow
        value={localValue.value}
        rows={meta.rows ?? 1}
        // Set maxRows to 3 when meta.rows is undefined or equal to 1, otherwise set it to rows * 2
        maxRows={Math.max(2 * (meta.rows ?? 1), 3)}
        onChange={localValue.set}
        onBlur={localValue.save}
        onSubmit={localValue.save}
      />
      <BindingPopover
        scope={scope}
        aliases={aliases}
        validate={(value) => {
          if (value !== undefined && typeof value !== "string") {
            return `${label} expects a string value`;
          }
        }}
        variant={variant}
        value={expression}
        onChange={(newExpression) =>
          onChange({ type: "expression", value: newExpression })
        }
        onRemove={(evaluatedValue) =>
          onChange({ type: "string", value: String(evaluatedValue) })
        }
      />
    </BindingControl>
  );

  const labelElement = (
    <Label
      htmlFor={id}
      description={meta.description}
      readOnly={overwritable === false}
    >
      {label}
    </Label>
  );

  if (isTwoColumnLayout) {
    return (
      <ResponsiveLayout
        label={labelElement}
        deletable={deletable}
        onDelete={onDelete}
      >
        {input}
      </ResponsiveLayout>
    );
  }

  return (
    <VerticalLayout
      label={labelElement}
      deletable={deletable}
      onDelete={onDelete}
    >
      {input}
    </VerticalLayout>
  );
};
