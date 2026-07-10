import { useId } from "react";
import { useStore } from "@nanostores/react";
import { InputField } from "@webstudio-is/design-system";
import { useDraftValue } from "~/builder/shared/use-draft-value";
import { HorizontalLayout, Label, Row } from "./shared";
import { $selectedInstance } from "~/shared/nano-states";
import { getInstanceLabel } from "~/builder/shared/instance-label";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";

const saveLabel = (label: string, instanceId: string) => {
  executeRuntimeMutation({
    id: "instances.setLabel",
    input: { instanceId, label },
  });
};

export const SettingsSection = () => {
  const selectedInstance = useStore($selectedInstance);
  const id = useId();
  const localValue = useDraftValue(
    selectedInstance?.label ?? "",
    (value) => selectedInstance && saveLabel(value, selectedInstance.id),
    { autoSave: false }
  );

  if (selectedInstance === undefined) {
    return;
  }

  const placeholder = getInstanceLabel(selectedInstance);

  return (
    <Row>
      <HorizontalLayout label={<Label htmlFor={id}>Name</Label>}>
        <InputField
          id={id}
          /* Key is required, otherwise when label is undefined, previous value stayed */
          key={selectedInstance.id}
          placeholder={placeholder}
          value={localValue.value}
          onChange={(event) => localValue.set(event.target.value)}
          onBlur={localValue.save}
        />
      </HorizontalLayout>
    </Row>
  );
};
