import {
  forwardRef,
  type ComponentProps,
  type ElementRef,
  type ReactNode,
} from "react";
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
  menuCss
);

const SubContentStyled = styled(DropdownMenuPrimitive.SubContent, subMenuCss);
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

export const StyledMenuItem = styled(DropdownMenuPrimitive.Item, itemCss, {
  defaultVariants: { withIndicator: true },
});
export const DropdownMenuItem = forwardRef<
  ElementRef<typeof StyledMenuItem>,
  ComponentProps<typeof StyledMenuItem> & { icon?: ReactNode }
>(({ icon, children, withIndicator, ...props }, forwardedRef) => (
  <StyledMenuItem
    withIndicator={withIndicator || Boolean(icon)}
    {...props}
    ref={forwardedRef}
  >
    {icon && <div className={itemIndicatorCss()}>{icon}</div>}
    {children}
  </StyledMenuItem>
));
DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuItemRightSlot = styled("span", {
  marginLeft: "auto",
  display: "flex",
});

const SubTriggerStyled = styled(DropdownMenuPrimitive.SubTrigger, itemCss, {
  defaultVariants: { withIndicator: true },
});
export const DropdownMenuSubTrigger = forwardRef<
  ElementRef<typeof SubTriggerStyled>,
  ComponentProps<typeof SubTriggerStyled> & { icon?: ReactNode }
>(({ children, withIndicator, icon, ...props }, forwardedRef) => (
  <SubTriggerStyled
    withIndicator={withIndicator || Boolean(icon)}
    {...props}
    ref={forwardedRef}
  >
    {icon && <div className={itemIndicatorCss()}>{icon}</div>}
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
  ComponentProps<typeof StyledRadioItem> & { icon?: ReactNode }
>(({ children, icon = <CheckMarkIcon />, ...props }, forwardedRef) => (
  <StyledRadioItem withIndicator {...props} ref={forwardedRef}>
    <Indicator>{icon}</Indicator>
    {children}
  </StyledRadioItem>
));
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem";

const StyledCheckboxItem = styled(DropdownMenuPrimitive.CheckboxItem, itemCss);
export const DropdownMenuCheckboxItem = forwardRef<
  ElementRef<typeof StyledCheckboxItem>,
  ComponentProps<typeof StyledCheckboxItem> & { icon?: ReactNode }
>(({ children, icon = <CheckMarkIcon />, ...props }, forwardedRef) => (
  <StyledCheckboxItem withIndicator {...props} ref={forwardedRef}>
    <Indicator>{icon}</Indicator>
    {children}
  </StyledCheckboxItem>
));
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem";

export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

export const DropdownMenuGroup = DropdownMenuPrimitive.Group;

export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
