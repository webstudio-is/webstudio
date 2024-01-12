import { useStore } from "@nanostores/react";
import {
  useId,
  TextArea,
  Flex,
  Label,
  theme,
  Tooltip,
  rawTheme,
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
import { HelpIcon } from "@webstudio-is/icons";

const useTextContent = (instanceId: Instance["id"]) => {
  const $store = useMemo(() => {
    return computed(
      $instances,
      (
        instances
      ):
        | undefined
        | { type: "text"; value: string }
        | { type: "expression"; value: string } => {
        const instance = instances.get(instanceId);
        if (instance === undefined) {
          return;
        }
        if (instance.children.length > 1) {
          return;
        }
        if (instance.children.length === 0) {
          return { type: "text", value: "" };
        }
        const [child] = instance.children;
        if (child.type === "text") {
          return child;
        }
      }
    );
  }, [instanceId]);
  return useStore($store);
};

export const TextContent = ({
  instanceId,
  meta,
  propName,
  computedValue,
}: ControlProps<"textContent">) => {
  const textContent = useTextContent(instanceId);
  const updateTextContent = (type: "text", value: string) => {
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
  const localValue = useLocalValue(String(computedValue ?? ""), (value) =>
    updateTextContent("text", value)
  );
  const id = useId();
  const label = getLabel(meta, propName);

  const { scope, aliases } = useStore($selectedInstanceScope);
  const expression: undefined | string =
    textContent?.type === "expression"
      ? textContent.value
      : JSON.stringify(computedValue);

  return (
    <VerticalLayout
      label={
        <Flex align="center" css={{ gap: theme.spacing[3] }}>
          <Label truncate>{label}</Label>
          {textContent === undefined && (
            <Tooltip
              content="Remove children to define text content"
              variant="wrapped"
            >
              <HelpIcon color={rawTheme.colors.foregroundSubtle} tabIndex={0} />
            </Tooltip>
          )}
        </Flex>
      }
      deletable={false}
      onDelete={() => {}}
    >
      <BindingControl>
        <TextArea
          id={id}
          disabled={textContent === undefined}
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
            removable={textContent?.type === "expression"}
            value={expression}
            onChange={(_newExpression) => {}}
            onRemove={(evaluatedValue) =>
              updateTextContent("text", String(evaluatedValue))
            }
          />
        )}
      </BindingControl>
    </VerticalLayout>
  );
};
