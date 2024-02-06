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

export const CompilerSection = (props: {
  settings: CompilerSettings;
  onChange: (settings: CompilerSettings) => void;
}) => {
  const ids = useIds(["atomicStyles"]);

  const handleChange =
    <Name extends keyof CompilerSettings>(name: Name) =>
    (value: CompilerSettings[Name]) => {
      props.onChange({
        ...props.settings,
        [name]: value,
      });
    };

  return (
    <Grid gap={2} css={{ mx: theme.spacing[5], px: theme.spacing[5] }}>
      <Text variant="titles">Compiler</Text>
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
