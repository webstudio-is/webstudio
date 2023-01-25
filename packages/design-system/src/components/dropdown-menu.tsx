import { forwardRef, type ComponentProps, type ElementRef } from "react";
import { CheckMarkIcon, ChevronFilledRightIcon } from "@webstudio-is/icons";
import { styled } from "../stitches.config";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import {
  menuCss,
  subMenuCss,
  separatorCss,
  itemCss,
  labelCss,
  itemIndicatorCss,
  subContentProps,
} from "./menu";
export { DropdownMenuArrow } from "./menu";

export const DropdownMenu = DropdownMenuPrimitive.Root;

export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export const DropdownMenuSub = DropdownMenuPrimitive.Sub;

export const DropdownMenuContent = styled(
  DropdownMenuPrimitive.Content,
  menuCss,
  { defaultVariants: { width: "regular" } }
);

const SubContentStyled = styled(DropdownMenuPrimitive.SubContent, subMenuCss, {
  defaultVariants: { width: "regular" },
});
export const DropdownMenuSubContent = forwardRef<
  ElementRef<typeof SubContentStyled>,
  ComponentProps<typeof SubContentStyled>
>((props, forwardedRef) => (
  <SubContentStyled {...subContentProps} {...props} ref={forwardedRef} />
));
DropdownMenuSubContent.displayName = "DropdownMenuSubContent";

export const DropdownMenuSeparator = styled(
  DropdownMenuPrimitive.Separator,
  separatorCss
);

export const DropdownMenuLabel = styled(DropdownMenuPrimitive.Label, labelCss);

export const DropdownMenuItem = styled(DropdownMenuPrimitive.Item, itemCss, {
  defaultVariants: { withIndicator: true },
});

export const DropdownMenuItemRightSlot = styled("span", {
  marginLeft: "auto",
  display: "flex",
});

const SubTriggerStyled = styled(DropdownMenuPrimitive.SubTrigger, itemCss, {
  defaultVariants: { withIndicator: true },
});
export const DropdownMenuSubTrigger = forwardRef<
  ElementRef<typeof SubTriggerStyled>,
  ComponentProps<typeof SubTriggerStyled>
>(({ children, ...props }, forwardedRef) => (
  <SubTriggerStyled {...props} ref={forwardedRef}>
    {children}
    <DropdownMenuItemRightSlot>
      <ChevronFilledRightIcon />
    </DropdownMenuItemRightSlot>
  </SubTriggerStyled>
));
DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger";

const Indicator = styled(DropdownMenuPrimitive.ItemIndicator, itemIndicatorCss);

const StyledRadioItem = styled(DropdownMenuPrimitive.RadioItem, itemCss);
export const DropdownMenuRadioItem = forwardRef<
  ElementRef<typeof StyledRadioItem>,
  ComponentProps<typeof StyledRadioItem>
>(({ children, ...props }, forwardedRef) => (
  <StyledRadioItem withIndicator {...props} ref={forwardedRef}>
    <Indicator>
      <CheckMarkIcon />
    </Indicator>
    {children}
  </StyledRadioItem>
));
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem";

const StyledCheckboxItem = styled(DropdownMenuPrimitive.CheckboxItem, itemCss);
export const DropdownMenuCheckboxItem = forwardRef<
  ElementRef<typeof StyledCheckboxItem>,
  ComponentProps<typeof StyledCheckboxItem>
>(({ children, ...props }, forwardedRef) => (
  <StyledCheckboxItem withIndicator {...props} ref={forwardedRef}>
    <Indicator>
      <CheckMarkIcon />
    </Indicator>
    {children}
  </StyledCheckboxItem>
));
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem";

export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

export const DropdownMenuGroup = DropdownMenuPrimitive.Group;

export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
