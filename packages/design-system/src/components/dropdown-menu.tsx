import {
  forwardRef,
  type ComponentProps,
  type ElementRef,
  type ReactElement,
  type ReactNode,
} from "react";
import { ChevronRightIcon } from "@webstudio-is/icons";
import { styled } from "../stitches.config";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import {
  menuCss,
  subMenuCss,
  separatorCss,
  menuItemCss,
  labelCss,
  menuItemIndicatorCss,
  subContentProps,
  MenuCheckedIcon,
} from "./menu";
export { DropdownMenuArrow } from "./menu";

export const DropdownMenu = DropdownMenuPrimitive.Root;

export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export const DropdownMenuSub = DropdownMenuPrimitive.Sub;

const DropdownMenuContentStyled = styled(
  DropdownMenuPrimitive.Content,
  menuCss
);
export const DropdownMenuContent = forwardRef<
  ElementRef<typeof DropdownMenuContentStyled>,
  ComponentProps<typeof DropdownMenuContentStyled>
>((props, ref) => {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuContentStyled {...props} ref={ref} />
    </DropdownMenuPrimitive.Portal>
  );
});

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

export const StyledMenuItem = styled(DropdownMenuPrimitive.Item, menuItemCss, {
  defaultVariants: { withIndicator: true },
});
export const DropdownMenuItem = forwardRef<
  ElementRef<typeof StyledMenuItem>,
  ComponentProps<typeof StyledMenuItem> & { icon?: ReactNode }
>(({ icon, children, withIndicator, ...props }, forwardedRef) =>
  icon ? (
    <StyledMenuItem
      withIndicator={withIndicator || Boolean(icon)}
      {...props}
      ref={forwardedRef}
    >
      <div className={menuItemIndicatorCss()}>{icon}</div>
      {children}
    </StyledMenuItem>
  ) : (
    <StyledMenuItem
      withIndicator={withIndicator || Boolean(icon)}
      {...props}
      ref={forwardedRef}
    >
      {children}
    </StyledMenuItem>
  )
);
DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuItemRightSlot = styled("span", {
  marginLeft: "auto",
  display: "flex",
});

const SubTriggerStyled = styled(DropdownMenuPrimitive.SubTrigger, menuItemCss, {
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
    {icon && <div className={menuItemIndicatorCss()}>{icon}</div>}
    {children}
    <DropdownMenuItemRightSlot>
      <ChevronRightIcon />
    </DropdownMenuItemRightSlot>
  </SubTriggerStyled>
));
DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger";

const Indicator = styled(
  DropdownMenuPrimitive.ItemIndicator,
  menuItemIndicatorCss
);

const StyledRadioItem = styled(DropdownMenuPrimitive.RadioItem, menuItemCss);
export const DropdownMenuRadioItem = forwardRef<
  ElementRef<typeof StyledRadioItem>,
  ComponentProps<typeof StyledRadioItem> & { icon?: ReactElement }
>(({ children, icon, ...props }, forwardedRef) => (
  <StyledRadioItem
    withIndicator={icon !== undefined}
    {...props}
    ref={forwardedRef}
  >
    {icon !== undefined && <Indicator>{icon}</Indicator>}
    {children}
  </StyledRadioItem>
));
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem";

const StyledCheckboxItem = styled(
  DropdownMenuPrimitive.CheckboxItem,
  menuItemCss
);
export const DropdownMenuCheckboxItem = forwardRef<
  ElementRef<typeof StyledCheckboxItem>,
  ComponentProps<typeof StyledCheckboxItem> & { icon?: ReactNode }
>(({ children, icon = <MenuCheckedIcon />, ...props }, forwardedRef) => (
  <StyledCheckboxItem withIndicator {...props} ref={forwardedRef}>
    <Indicator>{icon}</Indicator>
    {children}
  </StyledCheckboxItem>
));
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem";

export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

export const DropdownMenuGroup = DropdownMenuPrimitive.Group;
