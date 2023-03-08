import { useStore } from "@nanostores/react";
import { Flex, Label, TextField, theme } from "@webstudio-is/design-system";
import { getComponentMeta } from "@webstudio-is/react-sdk";
import { selectedInstanceStore } from "~/shared/nano-states";
import { useSettingsLogic } from "./use-settings-logic";

export const SettingsPanel = () => {
  const { setLabel, handleBlur, handleKeyDown } = useSettingsLogic();
  const selectedInstance = useStore(selectedInstanceStore);
  if (selectedInstance === undefined) {
    return null;
  }
  const label = getComponentMeta(selectedInstance.component)?.label;
  return (
    <Flex css={{ px: theme.spacing[9] }}>
      <Flex gap="1" direction="column" grow>
        <Label>Instance Name</Label>
        <TextField
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
    </Flex>
  );
};
