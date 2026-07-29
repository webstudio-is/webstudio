import { useId } from "react";
import { useStore } from "@nanostores/react";
import { TextArea } from "@webstudio-is/design-system";
import { validatePrimitiveValue } from "@webstudio-is/project-build/runtime";
import { useDraftValue } from "~/builder/shared/use-draft-value";
import {
  BindableExpressionControl,
  updateExpressionValue,
  useBindingState,
} from "~/builder/shared/bindable-expression";
import {
  type ControlProps,
  ResponsiveLayout,
  $selectedInstanceScope,
  humanizeAttribute,
} from "../shared";
import { PropertyLabel } from "../property-label";

export const TextControl = ({
  meta,
  prop,
  propName,
  computedValue,
  onChange,
}: ControlProps<"text">) => {
  const localValue = useDraftValue(String(computedValue ?? ""), (value) => {
    if (prop?.type === "expression") {
      updateExpressionValue(prop.value, value);
    } else {
      onChange({ type: "string", value });
    }
  });
  const id = useId();
  const label = humanizeAttribute(meta.label || propName);
  const { scope, aliases } = useStore($selectedInstanceScope);
  const expression =
    prop?.type === "expression" ? prop.value : JSON.stringify(computedValue);
  const { overwritable } = useBindingState(
    prop?.type === "expression" ? prop.value : undefined
  );

  const input = (
    <BindableExpressionControl
      expression={expression}
      value={localValue.value}
      bound={prop?.type === "expression"}
      scope={scope}
      aliases={aliases}
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
        <PropertyLabel name={propName} readOnly={overwritable === false} />
      }
    >
      {input}
    </ResponsiveLayout>
  );
};
