import {
  Grid,
  Label,
  theme,
  Text,
  CheckboxAndLabel,
  Checkbox,
} from "@webstudio-is/design-system";
import { useIds } from "~/shared/form-utils";
import type { ProjectSettings } from "./project-settings";

export const PublishSection = (props: {
  settings: ProjectSettings;
  onSettingsChange: (settings: ProjectSettings) => void;
}) => {
  const ids = useIds(["atomicStyles"]);

  const handleChange =
    <Name extends keyof ProjectSettings>(name: Name) =>
    (value: ProjectSettings[Name]) => {
      props.onSettingsChange({
        ...props.settings,
        [name]: value,
      });
    };

  return (
    <Grid gap={2} css={{ mx: theme.spacing[5], px: theme.spacing[5] }}>
      <Text variant="titles">Publish Settings</Text>
      <CheckboxAndLabel>
        <Checkbox
          checked={props.settings.atomicStyles ?? true}
          id={ids.atomicStyles}
          onCheckedChange={(checked) => {
            if (typeof checked === "boolean") {
              handleChange("atomicStyles")(checked);
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
