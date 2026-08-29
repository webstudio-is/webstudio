import { useStore } from "@nanostores/react";
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  MenuCheckedIcon,
} from "@webstudio-is/design-system";
import { $settings, setSetting } from "~/builder/shared/client-settings";

const colorSchemeOptions = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

export const ColorSchemeMenu = () => {
  const { colorScheme } = useStore($settings);

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>Theme</DropdownMenuSubTrigger>
      <DropdownMenuSubContent width="regular">
        <DropdownMenuRadioGroup
          value={colorScheme}
          onValueChange={(value) => {
            setSetting(
              "colorScheme",
              value as (typeof colorSchemeOptions)[number]["value"]
            );
          }}
        >
          {colorSchemeOptions.map(({ value, label }) => (
            <DropdownMenuRadioItem
              key={value}
              value={value}
              icon={<MenuCheckedIcon />}
            >
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};
