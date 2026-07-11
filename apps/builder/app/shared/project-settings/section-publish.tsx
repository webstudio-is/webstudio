import { useStore } from "@nanostores/react";
import {
  Grid,
  Label,
  CheckboxAndLabel,
  Checkbox,
  Text,
} from "@webstudio-is/design-system";
import type { CompilerSettings } from "@webstudio-is/sdk";
import { $projectSettings } from "~/shared/sync/data-stores";
import { useIds } from "~/shared/form-utils";
import { sectionSpacing } from "./utils";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";

const defaultPublishSettings: CompilerSettings = {
  atomicStyles: true,
};

export const SectionPublish = () => {
  const ids = useIds(["atomicStyles"]);
  const settings =
    useStore($projectSettings)?.compiler ?? defaultPublishSettings;

  const handleSave = (settings: CompilerSettings) => {
    executeRuntimeMutation({
      id: "projectSettings.update",
      input: { compiler: settings },
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
