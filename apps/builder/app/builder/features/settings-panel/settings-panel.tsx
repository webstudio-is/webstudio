import { Flex, Label, TextField, theme } from "@webstudio-is/design-system";
import type { Instance } from "@webstudio-is/project-build";
import { getComponentMeta } from "@webstudio-is/react-sdk";
import { useSettingsLogic } from "./use-settings-logic";

type SettingsPanelProps = {
  selectedInstance: Instance;
};

export const SettingsPanel = ({ selectedInstance }: SettingsPanelProps) => {
  const { setLabel, handleBlur, handleKeyDown } = useSettingsLogic({
    selectedInstance,
  });
  const label = getComponentMeta(selectedInstance.component)?.label;
  return (
    <Flex css={{ px: theme.spacing[9] }}>
      <Flex gap="1" direction="column" grow>
        <Label>Instance Name</Label>
        <TextField
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
