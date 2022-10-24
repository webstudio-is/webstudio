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

const visibilityVar = cssVars.define("visibility");

export const getItemMenuVars = (state: "visible" | "hidden") => {
  return {
    [visibilityVar]: state,
  };
};

const MenuButton = styled(IconButton, {
  visibility: cssVars.use(visibilityVar, "hidden"),
  color: "$hint",
  "&:hover, &:focus": {
    color: "$hiContrast",
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
          align="start"
          onEscapeKeyDown={() => {
            setIsOpen(false);
            onOpenChange(false);
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
