import { useState } from "react";
import {
  Grid,
  Label,
  CheckboxAndLabel,
  Checkbox,
  Text,
} from "@webstudio-is/design-system";
import type { CompilerSettings } from "@webstudio-is/sdk";
import { $pages } from "~/shared/nano-states";
import { useIds } from "~/shared/form-utils";
import { serverSyncStore } from "~/shared/sync";
import { sectionSpacing } from "./utils";

const defaultPublishSettings: CompilerSettings = {
  atomicStyles: true,
};

export const SectionPublish = () => {
  const ids = useIds(["atomicStyles"]);
  const [settings, setSettings] = useState(
    () => $pages.get()?.compiler ?? defaultPublishSettings
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
    <Grid gap={2}>
      <Text variant="titles" css={sectionSpacing}>
        Publishing
      </Text>
      <Grid gap={2} css={sectionSpacing}>
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
    </Grid>
  );
};
