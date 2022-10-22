import {
  DropdownMenu,
  DropdownMenuTrigger,
  IconButton,
  DropdownMenuContent,
  DropdownMenuItem,
  Text,
  DropdownMenuPortal,
  styled,
} from "@webstudio-is/design-system";
import { DotsHorizontalIcon } from "@webstudio-is/icons";
import { cssVars } from "@webstudio-is/css-vars";
import { useState } from "react";

export const itemMenuVars = {
  visibility: cssVars.define("visibility"),
};

const MenuButton = styled(IconButton, {
  visibility: cssVars.use(itemMenuVars.visibility, "hidden"),
  color: "$hint",
  "&:hover": {
    color: "$hiContrast",
    backgroundColor: "transparent",
  },
});

type ItemMenuProps = {
  onDelete: () => void;
  onOpen: () => void;
};

export const ItemMenu = ({ onDelete, onOpen }: ItemMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DropdownMenu
      onOpenChange={(state) => {
        setIsOpen(state);
        if (state === true) onOpen();
      }}
    >
      <DropdownMenuTrigger asChild>
        <MenuButton aria-label="Font menu">
          <DotsHorizontalIcon />
        </MenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent>
          <DropdownMenuItem
            onSelect={() => {
              onDelete();
            }}
          >
            <Text>Delete font</Text>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
};
