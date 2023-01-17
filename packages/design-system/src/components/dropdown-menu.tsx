import React from "react";
import { CheckIcon } from "@webstudio-is/icons";
import { styled, CSS } from "../stitches.config";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { menuCss, separatorCss, itemCss, labelCss } from "./menu";
import { Box } from "./box";
import { panelStyles } from "./panel";
import { theme } from "../stitches.config";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuArrow = styled(DropdownMenuPrimitive.Arrow, {
  fill: theme.colors.slate4,
  stroke: theme.colors.slate1,
});
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export const DropdownMenuSub = DropdownMenuPrimitive.Sub;

export const DropdownMenuSubTrigger = styled(
  DropdownMenuPrimitive.SubTrigger,
  itemCss
);

export const DropdownMenuContent = styled(
  DropdownMenuPrimitive.Content,
  menuCss,
  panelStyles
);

export const DropdownMenuSubContent = styled(
  DropdownMenuPrimitive.SubContent,
  menuCss,
  panelStyles
);
export const DropdownMenuSeparator = styled(
  DropdownMenuPrimitive.Separator,
  separatorCss
);
export const DropdownMenuItem = styled(DropdownMenuPrimitive.Item, itemCss);

const StyledDropdownMenuRadioItem = styled(
  DropdownMenuPrimitive.RadioItem,
  itemCss
);

type DialogMenuRadioItemPrimitiveProps = React.ComponentProps<
  typeof DropdownMenuPrimitive.RadioItem
>;
type DialogMenuRadioItemProps = DialogMenuRadioItemPrimitiveProps & {
  css?: CSS;
};

export const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof StyledDropdownMenuRadioItem>,
  DialogMenuRadioItemProps
>(({ children, ...props }, forwardedRef) => (
  <StyledDropdownMenuRadioItem {...props} ref={forwardedRef}>
    <Box as="span" css={{ position: "absolute", left: theme.spacing[3] }}>
      <DropdownMenuPrimitive.ItemIndicator>
        <CheckIcon />
      </DropdownMenuPrimitive.ItemIndicator>
    </Box>
    {children}
  </StyledDropdownMenuRadioItem>
));

DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem";

const StyledDropdownMenuCheckboxItem = styled(
  DropdownMenuPrimitive.CheckboxItem,
  itemCss
);

type DialogMenuCheckboxItemPrimitiveProps = React.ComponentProps<
  typeof DropdownMenuPrimitive.CheckboxItem
>;
type DialogMenuCheckboxItemProps = DialogMenuCheckboxItemPrimitiveProps & {
  css?: CSS;
};

export const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof StyledDropdownMenuCheckboxItem>,
  DialogMenuCheckboxItemProps
>(({ children, ...props }, forwardedRef) => (
  <StyledDropdownMenuCheckboxItem {...props} ref={forwardedRef}>
    <Box as="span" css={{ position: "absolute", left: theme.spacing[3] }}>
      <DropdownMenuPrimitive.ItemIndicator>
        <CheckIcon />
      </DropdownMenuPrimitive.ItemIndicator>
    </Box>
    {children}
  </StyledDropdownMenuCheckboxItem>
));

DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem";

export const DropdownMenuLabel = styled(DropdownMenuPrimitive.Label, labelCss);
export const DropdownMenuRadioGroup = styled(
  DropdownMenuPrimitive.RadioGroup,
  {}
);
export const DropdownMenuGroup = styled(DropdownMenuPrimitive.Group, {});
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
