import { useId } from "react";
import { TextArea } from "@webstudio-is/design-system";
import { validatePrimitiveValue } from "@webstudio-is/project-build/runtime";
import { useDraftValue } from "~/builder/shared/use-draft-value";
import { BindableExpressionControl } from "~/builder/shared/bindable-expression";
import {
  type ControlProps,
  ResponsiveLayout,
  humanizeAttribute,
} from "../shared";
import { PropertyLabel } from "../property-label";
import { useBindableControl } from "./use-bindable-control";

export const TextControl = ({
  meta,
  prop,
  propName,
  computedValue,
  onChange,
}: ControlProps<"text">) => {
  const binding = useBindableControl({
    boundExpression: prop?.type === "expression" ? prop : undefined,
    fallbackExpression: JSON.stringify(computedValue),
  });
  const localValue = useDraftValue(String(computedValue ?? ""), (value) => {
    if (binding.bindingState.overwritable === false) {
      return;
    }
    onChange({ type: "string", value });
  });
  const id = useId();
  const label = humanizeAttribute(meta.label || propName);
  const input = (
    <BindableExpressionControl
      {...binding}
      value={localValue.value}
      validate={(value) => validatePrimitiveValue(value, label)}
      onChangeValue={(value) => onChange({ type: "string", value })}
      onChangeExpression={(value) => onChange({ type: "expression", value })}
      onRemove={(value) => onChange({ type: "string", value: String(value) })}
      renderControl={({ readOnly }) => (
        <TextArea
          id={id}
          disabled={readOnly}
          autoGrow
          value={localValue.value}
          rows={meta.rows ?? 1}
          // Set maxRows to 3 when meta.rows is undefined or equal to 1, otherwise set it to rows * 2
          maxRows={Math.max(2 * (meta.rows ?? 1), 3)}
          onChange={localValue.set}
          onBlur={localValue.save}
          onSubmit={localValue.save}
        />
      )}
    />
  );

  return (
    <ResponsiveLayout
      label={
        <PropertyLabel
          name={propName}
          readOnly={binding.bindingState.overwritable === false}
        />
      }
    >
      {input}
    </ResponsiveLayout>
  );
};
