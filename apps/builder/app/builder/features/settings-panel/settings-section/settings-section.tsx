import { useStore } from "@nanostores/react";
import { InputField } from "@webstudio-is/design-system";
import {
  registeredComponentMetasStore,
  selectedInstanceStore,
} from "~/shared/nano-states";
import { useSettingsLogic } from "./use-settings-logic";
import { HorizontalLayout, Row } from "../shared";
import { getInstanceLabel } from "~/shared/instance-utils";

export const SettingsSection = () => {
  const { setLabel, handleBlur, handleKeyDown } = useSettingsLogic();
  const selectedInstance = useStore(selectedInstanceStore);
  const metas = useStore(registeredComponentMetasStore);
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
      <HorizontalLayout label="Name">
        <InputField
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
