import { useId, useMemo } from "react";
import { useStore } from "@nanostores/react";
import { computed } from "nanostores";
import { TextArea } from "@webstudio-is/design-system";
import type { Instance } from "@webstudio-is/sdk";
import { $instances } from "~/shared/nano-states";
import { serverSyncStore } from "~/shared/sync";
import {
  BindingControl,
  BindingPopover,
} from "~/builder/shared/binding-popover";
import {
  type ControlProps,
  useLocalValue,
  VerticalLayout,
  $selectedInstanceScope,
  Label,
  updateExpressionValue,
  useBindingState,
} from "../shared";
import { humanizeString } from "~/shared/string-utils";

const useInstance = (instanceId: Instance["id"]) => {
  const $store = useMemo(() => {
    return computed($instances, (instances) => instances.get(instanceId));
  }, [instanceId]);
  return useStore($store);
};

const updateChildren = (
  instanceId: Instance["id"],
  type: "text" | "expression",
  value: string
) => {
  serverSyncStore.createTransaction([$instances], (instances) => {
    const instance = instances.get(instanceId);
    if (instance === undefined) {
      return;
    }
    instance.children = [{ type, value }];
  });
};

export const TextContent = ({
  instanceId,
  meta,
  propName,
  computedValue,
}: ControlProps<"textContent">) => {
  const instance = useInstance(instanceId);
  // text content control is rendered only when empty or single child are present
  const child = instance?.children?.[0] ?? { type: "text", value: "" };
  const localValue = useLocalValue(String(computedValue ?? ""), (value) => {
    if (child.type === "expression") {
      updateExpressionValue(child.value, value);
    } else {
      updateChildren(instanceId, "text", value);
    }
  });
  const id = useId();
  const label = humanizeString(meta.label || propName);

  const { scope, aliases } = useStore($selectedInstanceScope);
  let expression: undefined | string;
  if (child.type === "text") {
    expression = JSON.stringify(child.value);
  }
  if (child.type === "expression") {
    expression = child.value;
  }

  const { overwritable, variant } = useBindingState(
    child.type === "expression" ? child.value : undefined
  );

  return (
    <VerticalLayout
      label={
        <Label
          htmlFor={id}
          description={meta.description}
          readOnly={overwritable === false}
        >
          {label}
        </Label>
      }
      deletable={false}
      onDelete={() => {}}
    >
      <BindingControl>
        <TextArea
          id={id}
          disabled={overwritable === false}
          autoGrow
          value={localValue.value}
          rows={1}
          onChange={localValue.set}
          onBlur={localValue.save}
          onSubmit={localValue.save}
        />
        {expression !== undefined && (
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
            onChange={(newExpression) => {
              updateChildren(instanceId, "expression", newExpression);
            }}
            onRemove={(evaluatedValue) =>
              updateChildren(instanceId, "text", String(evaluatedValue))
            }
          />
        )}
      </BindingControl>
    </VerticalLayout>
  );
};
