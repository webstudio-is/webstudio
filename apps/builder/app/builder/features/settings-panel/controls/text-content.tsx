import { useId, useMemo } from "react";
import { useStore } from "@nanostores/react";
import { computed } from "nanostores";
import { Flex, rawTheme, Text, TextArea } from "@webstudio-is/design-system";
import type { Instance } from "@webstudio-is/sdk";
import { AlertIcon } from "@webstudio-is/icons";
import { $instances } from "~/shared/nano-states";
import {
  BindingControl,
  BindingPopover,
} from "~/builder/shared/binding-popover";
import { updateWebstudioData } from "~/shared/instance-utils";
import {
  type ControlProps,
  useLocalValue,
  VerticalLayout,
  $selectedInstanceScope,
  updateExpressionValue,
  useBindingState,
} from "../shared";
import { FieldLabel } from "../property-label";

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
  updateWebstudioData((data) => {
    const instance = data.instances.get(instanceId);
    if (instance) {
      instance.children = [{ type, value }];
    }
  });
};

export const TextContent = ({
  instanceId,
  computedValue,
}: ControlProps<"textContent">) => {
  const instance = useInstance(instanceId);
  const hasChildren = (instance?.children.length ?? 0) > 0;
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
        <FieldLabel
          description={
            <>
              Plain text content that can be bound to either a variable or a
              resource value.
              {overwritable === false && (
                <Flex gap="1">
                  <AlertIcon
                    color={rawTheme.colors.backgroundAlertMain}
                    style={{ flexShrink: 0 }}
                  />
                  <Text>
                    The value is controlled by an expression and cannot be
                    changed.
                  </Text>
                </Flex>
              )}
            </>
          }
          resettable={hasChildren}
          onReset={() => {
            updateWebstudioData((data) => {
              const instance = data.instances.get(instanceId);
              if (instance) {
                instance.children = [];
              }
            });
          }}
        >
          Text Content
        </FieldLabel>
      }
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
                return `Text Content expects a string value`;
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
