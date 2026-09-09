import { useEffect, useId, useState } from "react";
import { useStore } from "@nanostores/react";
import { InputField, Tooltip } from "@webstudio-is/design-system";
import { useDraftValue } from "~/builder/shared/use-draft-value";
import { HorizontalLayout, Label, Row } from "./shared";
import { $selectedInstance } from "~/shared/nano-states";
import { getInstanceLabel } from "~/builder/shared/instance-label";
import {
  blockTemplateComponent,
  findParentInstanceReference,
  getContentBlockTemplateName,
} from "@webstudio-is/sdk";
import {
  executeRuntimeMutation,
  getDuplicateTemplateNameMessage,
} from "~/shared/instance-utils/data";
import {
  $externalContentRoots,
  externalContentInstanceNameMessage,
  isExternalContentInstance,
} from "~/shared/external-content-mutations";
import { $instances } from "~/shared/sync/data-stores";

export const SettingsSection = () => {
  const selectedInstance = useStore($selectedInstance);
  const instances = useStore($instances);
  const externalContentRoots = useStore($externalContentRoots);
  const labelId = useId();
  const nameId = useId();
  const [labelError, setLabelError] = useState<string>();
  const [nameError, setNameError] = useState<string>();
  useEffect(() => {
    setLabelError(undefined);
    setNameError(undefined);
  }, [selectedInstance?.id]);
  const labelValue = useDraftValue(
    selectedInstance?.label ?? "",
    (value) => {
      if (selectedInstance === undefined) {
        return;
      }
      if (
        isExternalContentInstance(
          $externalContentRoots.get(),
          selectedInstance.id
        )
      ) {
        return;
      }
      try {
        executeRuntimeMutation({
          id: "instances.setLabel",
          input: { instanceId: selectedInstance.id, label: value },
        });
        setLabelError(undefined);
      } catch (error) {
        const message = getDuplicateTemplateNameMessage(error);
        if (message === undefined) {
          throw error;
        }
        setLabelError(message);
      }
    },
    { autoSave: false }
  );
  const templateName =
    selectedInstance === undefined
      ? ""
      : getContentBlockTemplateName(selectedInstance);
  const nameValue = useDraftValue(
    templateName,
    (value) => {
      if (selectedInstance === undefined) {
        return;
      }
      try {
        executeRuntimeMutation({
          id: "instances.setName",
          input: { instanceId: selectedInstance.id, name: value },
        });
        setNameError(undefined);
      } catch (error) {
        setNameError(error instanceof Error ? error.message : String(error));
      }
    },
    { autoSave: false }
  );

  if (selectedInstance === undefined) {
    return;
  }

  const placeholder = getInstanceLabel(selectedInstance);
  const parent = findParentInstanceReference(
    instances,
    selectedInstance.id
  )?.instance;
  const isTemplate = parent?.component === blockTemplateComponent;
  const isNameEditable =
    isExternalContentInstance(externalContentRoots, selectedInstance.id) ===
    false;

  return (
    <Row>
      {isTemplate && (
        <HorizontalLayout label={<Label htmlFor={nameId}>Name</Label>}>
          <Tooltip content={nameError} delayDuration={0}>
            <InputField
              id={nameId}
              key={`${selectedInstance.id}:name`}
              value={nameValue.value}
              color={nameError === undefined ? undefined : "error"}
              aria-invalid={nameError === undefined ? undefined : true}
              disabled={isNameEditable === false}
              onChange={(event) => {
                setNameError(undefined);
                nameValue.set(event.target.value);
              }}
              onBlur={nameValue.save}
            />
          </Tooltip>
        </HorizontalLayout>
      )}
      <HorizontalLayout label={<Label htmlFor={labelId}>Label</Label>}>
        <Tooltip
          content={
            isNameEditable ? labelError : externalContentInstanceNameMessage
          }
          delayDuration={0}
        >
          <InputField
            id={labelId}
            /* Key is required, otherwise when label is undefined, previous value stayed */
            key={selectedInstance.id}
            placeholder={placeholder}
            value={labelValue.value}
            color={labelError === undefined ? undefined : "error"}
            aria-invalid={labelError === undefined ? undefined : true}
            disabled={isNameEditable === false}
            onChange={(event) => {
              setLabelError(undefined);
              labelValue.set(event.target.value);
            }}
            onBlur={labelValue.save}
          />
        </Tooltip>
      </HorizontalLayout>
    </Row>
  );
};
