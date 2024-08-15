import { useStore } from "@nanostores/react";
import { InputField, useId } from "@webstudio-is/design-system";
import {
  $instances,
  $registeredComponentMetas,
  $selectedInstance,
} from "~/shared/nano-states";
import { HorizontalLayout, Label, Row, useLocalValue } from "./shared";
import { getInstanceLabel } from "~/shared/instance-utils";
import { serverSyncStore } from "~/shared/sync";
import type { Instance } from "@webstudio-is/sdk";

const saveLabel = (label: string, selectedInstance: Instance) => {
  serverSyncStore.createTransaction([$instances], (instances) => {
    const instance = instances.get(selectedInstance.id);
    if (instance !== undefined) {
      instance.label = label;
    }
  });
};

export const SettingsSection = () => {
  const selectedInstance = useStore($selectedInstance);
  const metas = useStore($registeredComponentMetas);
  const id = useId();
  const localValue = useLocalValue(selectedInstance?.label ?? "", (value) => {
    if (selectedInstance) {
      saveLabel(value, selectedInstance);
    }
  });

  if (selectedInstance === undefined) {
    return null;
  }

  const meta = metas.get(selectedInstance.component);
  if (meta === undefined) {
    return null;
  }
  const placeholder = getInstanceLabel(selectedInstance, meta);

  return (
    <Row>
      <HorizontalLayout
        label={<Label htmlFor={id}>Name</Label>}
        deletable={false}
        onDelete={() => {}}
      >
        <InputField
          id={id}
          /* Key is required, otherwise when label is undefined, previous value stayed */
          key={selectedInstance.id}
          placeholder={placeholder}
          value={localValue.value}
          onChange={(event) => localValue.set(event.target.value.trim())}
          onBlur={localValue.save}
        />
      </HorizontalLayout>
    </Row>
  );
};
