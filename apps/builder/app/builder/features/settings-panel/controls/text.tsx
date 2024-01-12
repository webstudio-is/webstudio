import { useStore } from "@nanostores/react";
import { useId, TextArea } from "@webstudio-is/design-system";
import type { Instance } from "@webstudio-is/sdk";
import {
  BindingControl,
  BindingPopover,
} from "~/builder/shared/binding-popover";
import {
  type ControlProps,
  getLabel,
  useLocalValue,
  VerticalLayout,
  ResponsiveLayout,
  Label,
  updateExpressionValue,
  $selectedInstanceScope,
} from "../shared";
import { useMemo } from "react";
import { atom, computed } from "nanostores";
import { $instances } from "~/shared/nano-states";
import { textContentAttribute } from "@webstudio-is/react-sdk";

const useIsTextContentReadOnly = (
  instanceId: Instance["id"],
  propName: string
) => {
  const $store = useMemo(() => {
    if (propName !== textContentAttribute) {
      return atom(false);
    }
    return computed($instances, (instances) => {
      const instance = instances.get(instanceId);
      if (instance === undefined) {
        return false;
      }
      if (instance.children.length === 0) {
        return false;
      }
      if (
        instance.children.length === 1 &&
        instance.children[0].type === "text"
      ) {
        return false;
      }
      return true;
    });
  }, [instanceId, propName]);
  return useStore($store);
};

export const TextControl = ({
  instanceId,
  meta,
  prop,
  propName,
  deletable,
  computedValue,
  readOnly,
  onChange,
  onDelete,
}: ControlProps<"text">) => {
  const isTextContentReadOnly = useIsTextContentReadOnly(instanceId, propName);
  const localValue = useLocalValue(String(computedValue ?? ""), (value) => {
    if (prop?.type === "expression") {
      updateExpressionValue(prop.value, value);
    } else {
      onChange({ type: "string", value });
    }
  });
  const id = useId();
  const label = getLabel(meta, propName);
  const rows = meta.rows ?? 1;
  const isTwoColumnLayout = rows < 2;

  const { scope, aliases } = useStore($selectedInstanceScope);
  const expression =
    prop?.type === "expression" ? prop.value : JSON.stringify(computedValue);

  const input = (
    <BindingControl>
      <TextArea
        id={id}
        disabled={readOnly || isTextContentReadOnly}
        autoGrow
        value={localValue.value}
        rows={meta.rows ?? 1}
        // Set maxRows to 3 when meta.rows is undefined or equal to 1, otherwise set it to rows * 2
        maxRows={Math.max(2 * (meta.rows ?? 1), 3)}
        onChange={localValue.set}
        onBlur={localValue.save}
        onSubmit={localValue.save}
      />
      {isTextContentReadOnly === false && (
        <BindingPopover
          scope={scope}
          aliases={aliases}
          validate={(value) => {
            if (value !== undefined && typeof value !== "string") {
              return `${label} expects a string value`;
            }
          }}
          removable={prop?.type === "expression"}
          value={expression}
          onChange={(newExpression) =>
            onChange({ type: "expression", value: newExpression })
          }
          onRemove={(evaluatedValue) =>
            onChange({ type: "string", value: String(evaluatedValue) })
          }
        />
      )}
    </BindingControl>
  );

  const labelElement = (
    <Label
      htmlFor={id}
      description={meta.description}
      readOnly={readOnly}
      isTextContentReadOnly={isTextContentReadOnly}
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
