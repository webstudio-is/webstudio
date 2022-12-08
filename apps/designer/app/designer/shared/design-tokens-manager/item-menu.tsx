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
import {
  type FocusEventHandler,
  useState,
  useRef,
  useEffect,
  type MouseEventHandler,
} from "react";

const stopPropagation: MouseEventHandler = (event) => {
  // Prevent setting the current font to the item.
  event.stopPropagation();
};

const MenuButton = styled(IconButton, {
  color: "$hint",
  "&:hover, &:focus-visible": {
    color: "$hiContrast",
  },
});

type ItemMenuProps = {
  onDelete: () => void;
  onEdit: () => void;
  onOpenChange: (open: boolean) => void;
  onFocusTrigger?: FocusEventHandler;
  onBlurTrigger?: FocusEventHandler;
};

const ItemMenu = ({
  onDelete,
  onEdit,
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
          aria-label="Token menu"
          onFocus={onFocusTrigger}
          onBlur={onBlurTrigger}
          tabIndex={0}
          onClick={stopPropagation}
        >
          <MenuIcon />
        </MenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent align="start" css={{ zIndex: "$zIndices$1" }}>
          <DropdownMenuItem
            onClick={stopPropagation}
            onSelect={() => {
              onEdit();
            }}
          >
            <Text>Edit</Text>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={stopPropagation}
            onSelect={() => {
              onDelete();
            }}
          >
            <Text>Delete</Text>
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
  onEdit: (index: number) => void;
};

export const useMenu = ({
  selectedIndex,
  onSelect,
  onDelete,
  onEdit,
}: UseMenu) => {
  const openMenu = useRef(-1);
  const focusedMenuTrigger = useRef(-1);

  const render = (index: number) => {
    const show =
      selectedIndex === index ||
      openMenu.current === index ||
      focusedMenuTrigger.current === index;

    if (show === false) {
      return;
    }

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
        onEdit={() => {
          onEdit(index);
        }}
      />
    );
  };

  return {
    render,
    isOpen: openMenu.current !== -1,
  };
};
