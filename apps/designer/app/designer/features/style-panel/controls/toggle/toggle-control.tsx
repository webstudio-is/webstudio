import { ToggleGroup } from "@webstudio-is/design-system";
import {
  TextAlignLeftIcon,
  TextAlignCenterIcon,
  TextAlignRightIcon,
} from "@webstudio-is/icons";

export const ToggleGroupControl = () => (
  <ToggleGroup.Root
    type="single"
    defaultValue="center"
    aria-label="Text alignment"
  >
    <ToggleGroup.Item value="left" aria-label="Left aligned">
      <TextAlignLeftIcon />
    </ToggleGroup.Item>
    <ToggleGroup.Item value="center" aria-label="Center aligned">
      <TextAlignCenterIcon />
    </ToggleGroup.Item>
    <ToggleGroup.Item value="right" aria-label="Right aligned">
      <TextAlignRightIcon />
    </ToggleGroup.Item>
  </ToggleGroup.Root>
);
