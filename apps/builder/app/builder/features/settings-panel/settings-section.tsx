import { useId } from "react";
import { useStore } from "@nanostores/react";
import type { Instance } from "@webstudio-is/sdk";
import { InputField } from "@webstudio-is/design-system";
import { $instances } from "~/shared/sync/data-stores";
import { useDraftValue } from "~/builder/shared/use-draft-value";
import { HorizontalLayout, Label, Row } from "./shared";
import { serverSyncStore } from "~/shared/sync/sync-stores";
import { $selectedInstance } from "~/shared/nano-states";
import { getInstanceLabel } from "~/builder/shared/instance-label";
import { setInstanceLabelMutable } from "~/shared/instance-utils/mutation";

const saveLabel = (label: string, selectedInstance: Instance) => {
  serverSyncStore.createTransaction([$instances], (instances) => {
    setInstanceLabelMutable(instances, selectedInstance.id, label.trim());
  });
};

export const SettingsSection = () => {
  const selectedInstance = useStore($selectedInstance);
  const id = useId();
  const localValue = useDraftValue(
    selectedInstance?.label ?? "",
    (value) => selectedInstance && saveLabel(value, selectedInstance),
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
