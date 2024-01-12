import { useStore } from "@nanostores/react";
import {
  useId,
  TextArea,
  Flex,
  Label,
  theme,
} from "@webstudio-is/design-system";
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
  $selectedInstanceScope,
} from "../shared";
import { useMemo } from "react";
import { computed } from "nanostores";
import { $instances } from "~/shared/nano-states";
import { serverSyncStore } from "~/shared/sync";

const useInstance = (instanceId: Instance["id"]) => {
  const $store = useMemo(() => {
    return computed($instances, (instances) => instances.get(instanceId));
  }, [instanceId]);
  return useStore($store);
};

const updateChildren = (
  instanceId: Instance["id"],
  type: "text",
  value: string
) => {
  serverSyncStore.createTransaction([$instances], (instances) => {
    const instance = instances.get(instanceId);
    if (instance === undefined) {
      return;
    }
    if (type === "text") {
      instance.children = [{ type: "text", value }];
    }
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
  const localValue = useLocalValue(String(computedValue ?? ""), (value) =>
    updateChildren(instanceId, "text", value)
  );
  const id = useId();
  const label = getLabel(meta, propName);

  const { scope, aliases } = useStore($selectedInstanceScope);
  let expression: undefined | string;
  if (child?.type === "text") {
    expression = JSON.stringify(child.value);
  }

  return (
    <VerticalLayout
      label={
        <Flex align="center" css={{ gap: theme.spacing[3] }}>
          <Label truncate>{label}</Label>
        </Flex>
      }
      deletable={false}
      onDelete={() => {}}
    >
      <BindingControl>
        <TextArea
          id={id}
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
            removable={false}
            value={expression}
            onChange={(_newExpression) => {}}
            onRemove={(evaluatedValue) =>
              updateChildren(instanceId, "text", String(evaluatedValue))
            }
          />
        )}
      </BindingControl>
    </VerticalLayout>
  );
};
