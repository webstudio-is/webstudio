import { useStore } from "@nanostores/react";
import { Flex, Label, theme, InputField } from "@webstudio-is/design-system";
import {
  registeredComponentMetasStore,
  selectedInstanceStore,
} from "~/shared/nano-states";
import { useSettingsLogic } from "./use-settings-logic";

export const SettingsPanel = () => {
  const { setLabel, handleBlur, handleKeyDown } = useSettingsLogic();
  const selectedInstance = useStore(selectedInstanceStore);
  const metas = useStore(registeredComponentMetasStore);
  if (selectedInstance === undefined) {
    return null;
  }
  const label = metas.get(selectedInstance.component)?.label;
  return (
    <Flex
      gap="1"
      direction="column"
      grow
      css={{ px: theme.spacing[9], py: theme.spacing[9] }}
    >
      <Label>Instance Name</Label>
      <InputField
        /* Key is required, otherwise when label is undefined, previous value stayed */
        key={selectedInstance.id}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={label}
        defaultValue={selectedInstance.label}
        onChange={(event) => {
          setLabel(event.target.value.trim());
        }}
      />
    </Flex>
  );
};
