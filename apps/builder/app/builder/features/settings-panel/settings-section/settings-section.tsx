import { useStore } from "@nanostores/react";
import { InputField, useId } from "@webstudio-is/design-system";
import {
  $registeredComponentMetas,
  $selectedInstance,
} from "~/shared/nano-states";
import { useSettingsLogic } from "./use-settings-logic";
import { HorizontalLayout, Label, Row } from "../shared";
import { getInstanceLabel } from "~/shared/instance-utils";

export const SettingsSection = () => {
  const { setLabel, handleBlur, handleKeyDown } = useSettingsLogic();
  const selectedInstance = useStore($selectedInstance);
  const metas = useStore($registeredComponentMetas);
  const id = useId();

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
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          defaultValue={selectedInstance.label}
          onChange={(event) => {
            setLabel(event.target.value.trim());
          }}
        />
      </HorizontalLayout>
    </Row>
  );
};
