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
  onOpenChange: (open: boolean) => void;
};

export const ItemMenu = ({ onDelete, onOpenChange }: ItemMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <DropdownMenu
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        onOpenChange(open);
      }}
    >
      <DropdownMenuTrigger asChild>
        <MenuButton aria-label="Font menu">
          <DotsHorizontalIcon />
        </MenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent
          onEscapeKeyDown={() => {
            setIsOpen(false);
          }}
        >
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
