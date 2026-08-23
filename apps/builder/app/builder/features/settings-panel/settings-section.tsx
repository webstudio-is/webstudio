import { useEffect, useId, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { InputField, Text, Tooltip } from "@webstudio-is/design-system";
import { useDraftValue } from "~/builder/shared/use-draft-value";
import { HorizontalLayout, Label, Row } from "./shared";
import { $selectedInstance } from "~/shared/nano-states";
import { getInstanceLabel } from "~/builder/shared/instance-label";
import {
  executeRuntimeMutation,
  getDuplicateTemplateNameMessage,
  $pendingTemplateNameConfirmation,
} from "~/shared/instance-utils/data";

export const SettingsSection = () => {
  const selectedInstance = useStore($selectedInstance);
  const pendingConfirmation = useStore($pendingTemplateNameConfirmation);
  const id = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const hadPendingConfirmation = useRef(false);
  useEffect(() => setError(undefined), [selectedInstance?.id]);
  const localValue = useDraftValue(
    selectedInstance?.label ?? "",
    (value) => {
      if (selectedInstance === undefined) {
        return;
      }
      try {
        executeRuntimeMutation({
          id: "instances.setLabel",
          input: { instanceId: selectedInstance.id, label: value },
        });
        setError(undefined);
      } catch (caught) {
        const message = getDuplicateTemplateNameMessage(caught);
        if (message === undefined) {
          throw caught;
        }
        setError(message);
        requestAnimationFrame(() => inputRef.current?.focus());
        return false;
      }
    },
    { autoSave: false }
  );
  const resetLocalValue = localValue.reset;
  useEffect(() => {
    const pendingOperation =
      pendingConfirmation !== undefined && "operation" in pendingConfirmation
        ? pendingConfirmation.operation
        : undefined;
    const isPendingForInstance =
      pendingOperation?.id === "instances.setLabel" &&
      pendingOperation.input.instanceId === selectedInstance?.id;
    if (isPendingForInstance) {
      hadPendingConfirmation.current = true;
      return;
    }
    if (hadPendingConfirmation.current) {
      hadPendingConfirmation.current = false;
      resetLocalValue();
    }
  }, [pendingConfirmation, resetLocalValue, selectedInstance?.id]);

  if (selectedInstance === undefined) {
    return;
  }

  const placeholder = getInstanceLabel(selectedInstance);

  return (
    <Row>
      <HorizontalLayout label={<Label htmlFor={id}>Name</Label>}>
        <Tooltip
          open={error !== undefined}
          content={<Text id={errorId}>{error}</Text>}
        >
          <InputField
            id={id}
            /* Key is required, otherwise when label is undefined, previous value stayed */
            key={selectedInstance.id}
            inputRef={inputRef}
            placeholder={placeholder}
            value={localValue.value}
            color={error === undefined ? undefined : "error"}
            aria-invalid={error !== undefined}
            aria-errormessage={error === undefined ? undefined : errorId}
            onChange={(event) => {
              setError(undefined);
              localValue.set(event.target.value);
            }}
            onBlur={localValue.save}
          />
        </Tooltip>
      </HorizontalLayout>
    </Row>
  );
};
