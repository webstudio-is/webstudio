import {
  DropdownMenuTrigger,
  ToolbarButton,
} from "@webstudio-is/design-system";
import { MenuIcon } from "@webstudio-is/icons";

export const MenuButton = () => {
  return (
    <ToolbarButton asChild aria-label="Menu">
      <DropdownMenuTrigger>
        <MenuIcon size={22} />
      </DropdownMenuTrigger>
    </ToolbarButton>
  );
};
