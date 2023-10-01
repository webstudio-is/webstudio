import { useStore } from "@nanostores/react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DeprecatedIconButton,
  DropdownMenuContent,
  DropdownMenuItem,
  Text,
  DropdownMenuPortal,
  styled,
  Tooltip,
} from "@webstudio-is/design-system";
import { MenuIcon } from "@webstudio-is/icons";
import { type FocusEventHandler, useState, useRef, useEffect } from "react";
import { theme } from "@webstudio-is/design-system";
import { $authPermit } from "~/shared/nano-states";

const MenuButton = styled(DeprecatedIconButton, {
  color: theme.colors.hint,
  "&:hover, &:focus-visible": {
    color: theme.colors.hiContrast,
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

  const authPermit = useStore($authPermit);

  const isDeleteDisabled = authPermit === "view";
  const tooltipContent = isDeleteDisabled
    ? "View mode. You can't delete assets."
    : undefined;

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
          <Tooltip side="bottom" content={tooltipContent}>
            <DropdownMenuItem
              disabled={isDeleteDisabled}
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
          </Tooltip>
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
      />
    );
  };

  return {
    render,
    isOpen: openMenu.current !== -1,
  };
};
