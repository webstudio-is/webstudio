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
import { $runtimeInstances } from "~/shared/content-block-content";
import { validatePrimitiveValue } from "@webstudio-is/project-build/runtime";
import { useDraftValue } from "~/builder/shared/use-draft-value";
import { BindableExpressionControl } from "~/builder/shared/bindable-expression";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { CodeEditor } from "~/shared/code-editor";
import { type ControlProps, VerticalLayout } from "../shared";
import { FieldLabel, useIsBindingResetForbidden } from "../property-label";
import { useBindableControl } from "./use-bindable-control";
import { evaluateExpressionWithinScope } from "~/builder/shared/binding-popover";
import { getEditableTextTarget } from "@webstudio-is/project-build/runtime";
import { getTextContentUpdateOperation } from "./text-content-utils";

const useInstance = (instanceId: Instance["id"]) => {
  const $store = useMemo(() => {
    return computed($runtimeInstances, (instances) =>
      instances.get(instanceId)
    );
  }, [instanceId]);
  return useStore($store);
};

export const TextContent = ({
  instanceId,
  computedValue,
}: ControlProps<"textContent">) => {
  const instance = useInstance(instanceId);
  const childrenCount = instance?.children.length ?? 0;
  const hasChildren = childrenCount > 0;
  const hasMixedContent = childrenCount > 1;
  const target = instance && getEditableTextTarget(instance);
  const child = target?.child ?? { type: "text" as const, value: "" };
  const updateChild = (type: "text" | "expression", value: string) => {
    const operation = getTextContentUpdateOperation({ instance, type, value });
    if (operation !== undefined) {
      executeRuntimeMutation(operation);
    }
  };
  const resetBindings = (evaluatedValue: unknown) => {
    if (instance === undefined || target === undefined) {
      return;
    }
    const replacements = instance.children.flatMap((child, childIndex) => {
      if (child.type !== "expression") {
        return [];
      }
      const value =
        childIndex === target.childIndex
          ? evaluatedValue
          : evaluateExpressionWithinScope(child.value, binding.scope);
      return [
        {
          childIndex,
          expression: child.value,
          text: String(value),
        },
      ];
    });
    executeRuntimeMutation({
      id: "instances.setTextContent",
      input: {
        operation: "inlineExpressions",
        instanceId: instance.id,
        replacements,
      },
    });
  };

  const expression =
    child.type === "text" ? JSON.stringify(child.value) : child.value;

  const binding = useBindableControl({
    boundExpression: child.type === "expression" ? expression : undefined,
    fallbackExpression: expression,
  });
  let displayedValue = computedValue;
  if (hasMixedContent && child.type === "expression") {
    try {
      displayedValue = evaluateExpressionWithinScope(
        child.value,
        binding.scope
      );
    } catch {
      displayedValue = undefined;
    }
  }
  const localValue = useDraftValue(String(displayedValue ?? ""), (value) => {
    if (child.type === "expression") {
      return;
    }
    updateChild("text", value);
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
          resettable={hasChildren}
          resetDisabled={isResetDisabled || hasMixedContent}
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
        value={localValue.value}
        validate={(value) => validatePrimitiveValue(value, "Text Content")}
        onChangeValue={(value) => updateChild("text", value)}
        onChangeExpression={(value) => updateChild("expression", value)}
        onRemove={resetBindings}
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
