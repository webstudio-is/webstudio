import { useMemo } from "react";
import { useStore } from "@nanostores/react";
import { computed } from "nanostores";
import {
  DialogClose,
  DialogMaximize,
  DialogTitle,
  DialogTitleActions,
  Flex,
  rawTheme,
  Text,
} from "@webstudio-is/design-system";
import type { Instance } from "@webstudio-is/sdk";
import { AlertIcon } from "@webstudio-is/icons";
import { $instances } from "~/shared/sync/data-stores";
import { validatePrimitiveValue } from "@webstudio-is/project-build/runtime";
import { useDraftValue } from "~/builder/shared/use-draft-value";
import {
  BindableExpressionControl,
  updateExpressionValue,
  useBindingState,
} from "~/builder/shared/bindable-expression";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { CodeEditor } from "~/shared/code-editor";
import {
  type ControlProps,
  VerticalLayout,
  $selectedInstanceScope,
} from "../shared";
import { FieldLabel, useIsBindingResetForbidden } from "../property-label";

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
  executeRuntimeMutation({
    id: "instances.setTextContent",
    input: {
      operation: "set",
      instanceId,
      mode: type,
      text: value,
    },
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
  const localValue = useDraftValue(String(computedValue ?? ""), (value) => {
    if (child.type === "expression") {
      updateExpressionValue(child.value, value);
    } else {
      updateChildren(instanceId, "text", value);
    }
  });

  const { scope, aliases } = useStore($selectedInstanceScope);
  let expression: undefined | string;
  if (child.type === "text") {
    expression = JSON.stringify(child.value);
  }
  if (child.type === "expression") {
    expression = child.value;
  }

  const { overwritable } = useBindingState(
    child.type === "expression" ? child.value : undefined
  );
  const isBindingResetForbidden = useIsBindingResetForbidden();
  const isResetDisabled =
    child.type === "expression" && isBindingResetForbidden;

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
          resetDisabled={isResetDisabled}
          onReset={() => {
            executeRuntimeMutation({
              id: "instances.setTextContent",
              input: {
                operation: "reset",
                instanceId,
              },
            });
          }}
        >
          Text Content
        </FieldLabel>
      }
    >
      <BindableExpressionControl
        expression={expression ?? ""}
        value={localValue.value}
        bound={child.type === "expression"}
        showBinding={expression !== undefined}
        scope={scope}
        aliases={aliases}
        validate={(value) => validatePrimitiveValue(value, "Text Content")}
        onChangeValue={(value) => updateChildren(instanceId, "text", value)}
        onChangeExpression={(value) =>
          updateChildren(instanceId, "expression", value)
        }
        onRemove={(value) => updateChildren(instanceId, "text", String(value))}
        renderControl={({ readOnly }) => (
          <CodeEditor
            title={
              <DialogTitle
                maximizable
                suffix={
                  <DialogTitleActions>
                    <DialogMaximize />
                    <DialogClose />
                  </DialogTitleActions>
                }
              >
                <Text variant="labels">Text content</Text>
              </DialogTitle>
            }
            size="small"
            readOnly={readOnly}
            value={localValue.value}
            onChange={localValue.set}
            onChangeComplete={localValue.save}
          />
        )}
      />
    </VerticalLayout>
  );
};
