import {
  Grid,
  Label,
  theme,
  Text,
  CheckboxAndLabel,
  Checkbox,
} from "@webstudio-is/design-system";
import type { ClonableSettings, ProjectRouter } from "@webstudio-is/project";
import { useState } from "react";
import { useIds } from "~/shared/form-utils";
import { $project } from "~/shared/nano-states";
import { createTrpcRemixProxy } from "~/shared/remix/trpc-remix-proxy";
import { projectsPath } from "~/shared/router-utils";

const trpc = createTrpcRemixProxy<ProjectRouter>(projectsPath);

export const ClonableSection = () => {
  const ids = useIds(["isClonable"]);
  const [clonableSettings, setClonableSettings] = useState<ClonableSettings>(
    () => ({
      isClonable: $project.get()?.isClonable,
    })
  );

  const { send: updateClonableSettings } =
    trpc.updateClonableSettings.useMutation();

  const handleSave = (settings: ClonableSettings) => {
    const project = $project.get();
    if (project) {
      updateClonableSettings({
        projectId: project.id,
        ...settings,
      });
    }
  };

  return (
    <Grid gap={2} css={{ mx: theme.spacing[5], px: theme.spacing[5] }}>
      <Text variant="titles">Clonable</Text>
      <CheckboxAndLabel>
        <Checkbox
          checked={clonableSettings.isClonable ?? false}
          id={ids.isClonable}
          onCheckedChange={(isClonable) => {
            if (typeof isClonable === "boolean") {
              const nextSettings = { ...clonableSettings, isClonable };
              setClonableSettings(nextSettings);
              handleSave(nextSettings);
            }
          }}
        />
        <Label htmlFor={ids.isClonable}>
          Allow cloning the project with View permission
        </Label>
      </CheckboxAndLabel>
    </Grid>
  );
};
