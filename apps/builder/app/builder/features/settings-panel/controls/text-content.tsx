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
  updateBindableValue,
} from "~/builder/shared/bindable-expression";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { CodeEditor } from "~/shared/code-editor";
import {
  $selectedInstanceScope,
  type ControlProps,
  VerticalLayout,
} from "../shared";
import { FieldLabel, useIsBindingResetForbidden } from "../property-label";
import { useBindableControl } from "./use-bindable-control";
import { evaluateExpressionWithinScope } from "~/builder/shared/binding-popover";
import { getEditableTextTarget } from "./text-content-utils";

const useInstance = (instanceId: Instance["id"]) => {
  const $store = useMemo(() => {
    return computed($instances, (instances) => instances.get(instanceId));
  }, [instanceId]);
  return useStore($store);
};

const updateChild = (
  instanceId: Instance["id"],
  childIndex: number | undefined,
  type: "text" | "expression",
  value: string
) => {
  if (childIndex !== undefined) {
    executeRuntimeMutation({
      id: "instances.updateText",
      input: {
        instanceId,
        childIndex,
        mode: type,
        text: value,
      },
    });
    return;
  }
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
  const target = instance && getEditableTextTarget(instance);
  const childIndex = target?.childIndex;
  const child = target?.child ?? { type: "text" as const, value: "" };
  const hasMixedContent = (instance?.children.length ?? 0) > 1;
  const { scope } = useStore($selectedInstanceScope);
  let displayedValue = computedValue;
  if (
    instance !== undefined &&
    instance.children.length > 1 &&
    child.type === "expression"
  ) {
    try {
      displayedValue = evaluateExpressionWithinScope(child.value, scope);
    } catch {
      displayedValue = undefined;
    }
  }
  const localValue = useDraftValue(String(displayedValue ?? ""), (value) => {
    updateBindableValue({
      expression: child.type === "expression" ? child.value : undefined,
      value,
      onChangeValue: (value) =>
        updateChild(instanceId, childIndex, "text", value),
    });
  });

  let expression: undefined | string;
  if (child.type === "text") {
    expression = JSON.stringify(child.value);
  }
  if (child.type === "expression") {
    expression = child.value;
  }

  const binding = useBindableControl({
    boundExpression: child.type === "expression" ? expression : undefined,
    fallbackExpression: expression ?? "",
  });
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
              {binding.bindingState.overwritable === false && (
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
          resettable={hasChildren && hasMixedContent === false}
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
        {...binding}
        allowBindingRemoval={hasMixedContent === false}
        value={localValue.value}
        showBinding={expression !== undefined}
        validate={(value) => validatePrimitiveValue(value, "Text Content")}
        onChangeValue={(value) =>
          updateChild(instanceId, childIndex, "text", value)
        }
        onChangeExpression={(value) =>
          updateChild(instanceId, childIndex, "expression", value)
        }
        onRemove={(value) =>
          updateChild(instanceId, childIndex, "text", String(value))
        }
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
