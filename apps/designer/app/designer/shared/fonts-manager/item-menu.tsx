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
import { MenuIcon } from "@webstudio-is/icons";
import { type FocusEventHandler, useState, useRef, useEffect } from "react";

const MenuButton = styled(IconButton, {
  color: "$hint",
  "&:hover, &:focus-visible": {
    color: "$hiContrast",
  },
});

type ItemMenuProps = {
  onDelete: () => void;
  onOpenChange: (open: boolean) => void;
  onFocusTrigger?: FocusEventHandler;
  onBlurTrigger?: FocusEventHandler;
};

const ItemMenu = ({
  onDelete,
  onOpenChange,
  onFocusTrigger,
  onBlurTrigger,
}: ItemMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return (
    <DropdownMenu
      open={isOpen}
      onOpenChange={(open) => {
        // Apparently onOpenChange can be called after component was unmounted and results in warning.
        // Use case: deleting list item removes the item itself while menu is open.
        if (isMounted.current) {
          setIsOpen(open);
        }
        onOpenChange(open);
      }}
    >
      <DropdownMenuTrigger asChild>
        <MenuButton
          aria-label="Font menu"
          onFocus={onFocusTrigger}
          onBlur={onBlurTrigger}
          tabIndex={0}
          onClick={(event) => {
            // Prevent setting the current font to the item.
            event.stopPropagation();
          }}
        >
          <MenuIcon />
        </MenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onClick={(event) => {
              // Prevent setting the current font to the item.
              event.stopPropagation();
            }}
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

type UseMenu = {
  selectedIndex: number;
  onSelect: (index: number) => void;
  onDelete: (index: number) => void;
};

export const useMenu = ({ selectedIndex, onSelect, onDelete }: UseMenu) => {
  const openMenu = useRef(-1);
  const focusedMenuTrigger = useRef(-1);

  const render = (index: number) => {
    const show =
      selectedIndex === index ||
      openMenu.current === index ||
      focusedMenuTrigger.current === index;

    if (show === false) return;

    return (
      <ItemMenu
        onOpenChange={(open) => {
          openMenu.current = open === true ? index : -1;
          onSelect(index);
        }}
        onDelete={() => {
          onDelete(index);
        }}
        onFocusTrigger={() => {
          focusedMenuTrigger.current = index;
          onSelect(-1);
        }}
        onBlurTrigger={() => {
          focusedMenuTrigger.current = -1;
        }}
      />
    );
  };

  return {
    render,
    isOpen: openMenu.current !== -1,
  };
};
