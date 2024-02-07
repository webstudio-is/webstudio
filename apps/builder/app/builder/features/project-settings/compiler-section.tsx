import {
  Grid,
  Label,
  theme,
  Text,
  CheckboxAndLabel,
  Checkbox,
} from "@webstudio-is/design-system";
import { useIds } from "~/shared/form-utils";
import type { CompilerSettings } from "@webstudio-is/sdk";
import { serverSyncStore } from "~/shared/sync";
import { $pages } from "~/shared/nano-states";
import { useState } from "react";

const defaultSettings: CompilerSettings = {
  atomicStyles: true,
};

export const CompilerSection = () => {
  const ids = useIds(["atomicStyles"]);
  const [settings, setSettings] = useState(
    () => $pages.get()?.compiler ?? defaultSettings
  );

  const handleSave = (settings: CompilerSettings) => {
    serverSyncStore.createTransaction([$pages], (pages) => {
      if (pages === undefined) {
        return;
      }
      pages.compiler = settings;
    });
  };

  return (
    <Grid gap={2} css={{ mx: theme.spacing[5], px: theme.spacing[5] }}>
      <Text variant="titles">Compiler</Text>
      <CheckboxAndLabel>
        <Checkbox
          checked={settings.atomicStyles ?? true}
          id={ids.atomicStyles}
          onCheckedChange={(atomicStyles) => {
            if (typeof atomicStyles === "boolean") {
              const nextSettings = { ...settings, atomicStyles };
              setSettings(nextSettings);
              handleSave(nextSettings);
            }
          }}
        />
        <Label htmlFor={ids.atomicStyles}>
          Generate atomic CSS when publishing
        </Label>
      </CheckboxAndLabel>
    </Grid>
  );
};
