import { useMemo, type MouseEvent as ReactMouseEvent } from "react";
import { useStore } from "@nanostores/react";
import { computed } from "nanostores";
import {
  Box,
  Button,
  DialogClose,
  DialogMaximize,
  DialogTitle,
  DialogTitleActions,
  Flex,
  rawTheme,
  Text,
  theme,
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
import { evaluateExpressionWithinScope } from "~/builder/shared/binding-popover";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { CodeEditor } from "~/shared/code-editor";
import { selectInstance } from "~/shared/nano-states";
import {
  classifyInstanceContent,
  type ContentPart,
} from "~/shared/instance-utils/content";
import {
  $selectedInstanceScope,
  type ControlProps,
  VerticalLayout,
} from "../shared";
import { FieldLabel, useIsBindingResetForbidden } from "../property-label";
import { useBindableControl } from "./use-bindable-control";

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

const updateContentPart = ({
  instanceId,
  part,
  replacement,
}: {
  instanceId: Instance["id"];
  part: Extract<ContentPart, { type: "text" | "expression" }>;
  replacement?: { type: "text" | "expression"; value: string };
}) => {
  executeRuntimeMutation({
    id: "system.updateContentPart",
    input: {
      instanceId,
      childIndex: part.childIndex,
      expectedChild: { type: part.type, value: part.value },
      replacement,
    },
  });
};

const removeContentPart = ({
  event,
  instanceId,
  part,
}: {
  event: ReactMouseEvent<HTMLButtonElement>;
  instanceId: Instance["id"];
  part: Extract<ContentPart, { type: "text" | "expression" }>;
}) => {
  const row =
    event.currentTarget.closest<HTMLElement>("[data-content-part]") ??
    undefined;
  const rowsContainer = row?.parentElement ?? undefined;
  const rowIndex =
    row === undefined || rowsContainer === undefined
      ? -1
      : Array.from(
          rowsContainer.querySelectorAll("[data-content-part]")
        ).indexOf(row);
  updateContentPart({ instanceId, part });
  queueMicrotask(() => {
    if (rowsContainer === undefined || rowIndex === -1) {
      return;
    }
    const rows = rowsContainer.querySelectorAll<HTMLElement>(
      "[data-content-part]"
    );
    const nextRow = rows[Math.min(rowIndex, rows.length - 1)];
    nextRow
      ?.querySelector<HTMLElement>(
        'textarea, input, [contenteditable="true"], button'
      )
      ?.focus();
  });
};

const PrimitiveContentPart = ({
  instanceId,
  part,
  position,
}: {
  instanceId: Instance["id"];
  part: Extract<ContentPart, { type: "text" | "expression" }>;
  position: number;
}) => {
  const { scope } = useStore($selectedInstanceScope);
  let computedValue: unknown = part.value;
  if (part.type === "expression") {
    try {
      computedValue = evaluateExpressionWithinScope(part.value, scope);
    } catch {
      computedValue = undefined;
    }
  }
  const localValue = useDraftValue(String(computedValue ?? ""), (value) => {
    updateBindableValue({
      expression: part.type === "expression" ? part.value : undefined,
      value,
      onChangeValue: (value) =>
        updateContentPart({
          instanceId,
          part,
          replacement: { type: "text", value },
        }),
    });
  });
  const expression =
    part.type === "expression" ? part.value : JSON.stringify(part.value);
  const binding = useBindableControl({
    boundExpression: part.type === "expression" ? expression : undefined,
    fallbackExpression: expression,
  });
  const isBindingResetForbidden = useIsBindingResetForbidden();
  const typeLabel =
    part.type === "text" && part.value === "" ? "Empty text" : part.type;
  const label = `${position}. ${typeLabel}`;

  return (
    <Box
      data-content-part=""
      aria-label={`${label} content part`}
      css={{
        border: `1px solid ${rawTheme.colors.borderMain}`,
        borderRadius: theme.borderRadius[4],
        padding: theme.spacing[3],
      }}
    >
      <Flex direction="column" gap="2">
        <Flex align="center" justify="between" gap="2">
          <Text variant="labels" css={{ textTransform: "capitalize" }}>
            {label}
          </Text>
          <Button
            color="neutral"
            aria-label={`Remove ${label.toLowerCase()}`}
            disabled={
              part.type === "expression" && isBindingResetForbidden === true
            }
            onClick={(event) => removeContentPart({ event, instanceId, part })}
          >
            Remove
          </Button>
        </Flex>
        {part.type === "expression" && (
          <Text
            color="subtle"
            css={{ wordBreak: "break-word", whiteSpace: "pre-wrap" }}
          >
            Expression: {part.value}
          </Text>
        )}
        <BindableExpressionControl
          {...binding}
          value={localValue.value}
          showBinding
          validate={(value) => validatePrimitiveValue(value, label)}
          onChangeValue={(value) =>
            updateContentPart({
              instanceId,
              part,
              replacement: { type: "text", value },
            })
          }
          onChangeExpression={(value) =>
            updateContentPart({
              instanceId,
              part,
              replacement: { type: "expression", value },
            })
          }
          onRemove={(value) =>
            updateContentPart({
              instanceId,
              part,
              replacement: { type: "text", value: String(value ?? "") },
            })
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
                  <Text variant="labels">{label}</Text>
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
        {part.type === "expression" && computedValue === undefined && (
          <Text color="subtle">Computed value is unavailable.</Text>
        )}
      </Flex>
    </Box>
  );
};

const InstanceContentPart = ({
  part,
  position,
  parentInstanceSelector,
}: {
  part: Extract<ContentPart, { type: "instance" }>;
  position: number;
  parentInstanceSelector?: string[];
}) => {
  const name = part.label ?? part.component ?? "Element";
  return (
    <Box
      data-content-part=""
      aria-label={`${position}. Element content part`}
      css={{
        border: `1px solid ${rawTheme.colors.borderMain}`,
        borderRadius: theme.borderRadius[4],
        padding: theme.spacing[3],
      }}
    >
      <Flex align="center" justify="between" gap="2">
        <Flex direction="column" gap="1">
          <Text variant="labels">
            {position}. Element: {name}
          </Text>
          {part.label !== undefined && part.component !== undefined && (
            <Text color="subtle">{part.component}</Text>
          )}
        </Flex>
        <Button
          color="neutral"
          aria-label={`Select element ${name}`}
          onClick={() =>
            selectInstance([part.instanceId, ...(parentInstanceSelector ?? [])])
          }
        >
          Select element
        </Button>
      </Flex>
    </Box>
  );
};

export const ContentParts = ({
  instanceId,
  instanceSelector,
  parts,
  computedValue,
}: {
  instanceId: Instance["id"];
  instanceSelector?: string[];
  parts: ContentPart[];
  computedValue: unknown;
}) => (
  <VerticalLayout label={<FieldLabel>Content</FieldLabel>}>
    <Flex direction="column" gap="2">
      {parts.map((part, index) =>
        part.type === "instance" ? (
          <InstanceContentPart
            key={`${part.childIndex}:${part.instanceId}`}
            part={part}
            position={index + 1}
            parentInstanceSelector={instanceSelector}
          />
        ) : (
          <PrimitiveContentPart
            key={`${part.childIndex}:${part.type}`}
            instanceId={instanceId}
            part={part}
            position={index + 1}
          />
        )
      )}
      {computedValue !== undefined && (
        <Flex direction="column" gap="1">
          <Text variant="labels">Preview</Text>
          <Box
            aria-label="Content preview"
            css={{
              background: rawTheme.colors.backgroundControls,
              borderRadius: theme.borderRadius[4],
              padding: theme.spacing[3],
              whiteSpace: "pre-wrap",
            }}
          >
            <Text>{String(computedValue)}</Text>
          </Box>
        </Flex>
      )}
    </Flex>
  </VerticalLayout>
);

const SimpleTextContent = ({
  instanceId,
  instance,
  computedValue,
}: {
  instanceId: Instance["id"];
  instance: Instance;
  computedValue: unknown;
}) => {
  const hasChildren = instance.children.length > 0;
  const child = instance.children[0] ?? { type: "text", value: "" };
  const localValue = useDraftValue(String(computedValue ?? ""), (value) => {
    updateBindableValue({
      expression: child.type === "expression" ? child.value : undefined,
      value,
      onChangeValue: (value) => updateChildren(instanceId, "text", value),
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
          Text content
        </FieldLabel>
      }
    >
      <BindableExpressionControl
        {...binding}
        value={localValue.value}
        showBinding={expression !== undefined}
        validate={(value) => validatePrimitiveValue(value, "Text content")}
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

export const TextContent = ({
  instanceId,
  instanceSelector,
  computedValue,
}: ControlProps<"textContent">) => {
  const instance = useInstance(instanceId);
  const instances = useStore($instances);
  const contentMode =
    instance === undefined
      ? { type: "unsupported" as const }
      : classifyInstanceContent({ instance, instances, supported: true });

  if (contentMode.type === "parts") {
    return (
      <ContentParts
        instanceId={instanceId}
        instanceSelector={instanceSelector}
        parts={contentMode.parts}
        computedValue={computedValue}
      />
    );
  }
  if (contentMode.type !== "simple" || instance === undefined) {
    return;
  }

  return (
    <SimpleTextContent
      instanceId={instanceId}
      instance={instance}
      computedValue={computedValue}
    />
  );
};
