import {
  forwardRef,
  type ComponentProps,
  type ElementRef,
  type ReactElement,
  type ReactNode,
} from "react";
import { ChevronRightIcon } from "@webstudio-is/icons";
import { styled } from "../stitches.config";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
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
import type { Simplify } from "type-fest";

export const ContextMenu = ContextMenuPrimitive.Root;

export const ContextMenuTrigger = ContextMenuPrimitive.Trigger;

export const ContextMenuSub = ContextMenuPrimitive.Sub;

const ContextMenuContentStyled = styled(ContextMenuPrimitive.Content, menuCss);
export const ContextMenuContent = forwardRef<
  ElementRef<typeof ContextMenuContentStyled>,
  ComponentProps<typeof ContextMenuContentStyled>
>((props, ref) => {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuContentStyled {...props} ref={ref} />
    </ContextMenuPrimitive.Portal>
  );
});

const SubContentStyled = styled(ContextMenuPrimitive.SubContent, subMenuCss);
export const ContextMenuSubContent = forwardRef<
  ElementRef<typeof SubContentStyled>,
  ComponentProps<typeof SubContentStyled>
>((props, forwardedRef) => (
  <SubContentStyled {...subContentProps} {...props} ref={forwardedRef} />
));
ContextMenuSubContent.displayName = "ContextMenuSubContent";

export const ContextMenuSeparator = styled(
  ContextMenuPrimitive.Separator,
  separatorCss
);

export const ContextMenuLabel = styled(ContextMenuPrimitive.Label, labelCss);

const StyledMenuItem = styled(ContextMenuPrimitive.Item, menuItemCss, {
  defaultVariants: { withIndicator: true },
});

export const ContextMenuItem = forwardRef<
  ElementRef<typeof StyledMenuItem>,
  Simplify<ComponentProps<typeof StyledMenuItem> & { icon?: ReactNode }>
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
ContextMenuItem.displayName = "ContextMenuItem";

export const ContextMenuItemRightSlot = styled("span", {
  marginLeft: "auto",
  display: "flex",
});

const SubTriggerStyled = styled(ContextMenuPrimitive.SubTrigger, menuItemCss, {
  defaultVariants: { withIndicator: true },
});
export const ContextMenuSubTrigger = forwardRef<
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
    <ContextMenuItemRightSlot>
      <ChevronRightIcon />
    </ContextMenuItemRightSlot>
  </SubTriggerStyled>
));
ContextMenuSubTrigger.displayName = "ContextMenuSubTrigger";

const Indicator = styled(
  ContextMenuPrimitive.ItemIndicator,
  menuItemIndicatorCss
);

const StyledRadioItem = styled(ContextMenuPrimitive.RadioItem, menuItemCss);
export const ContextMenuRadioItem = forwardRef<
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
ContextMenuRadioItem.displayName = "ContextMenuRadioItem";

const StyledCheckboxItem = styled(
  ContextMenuPrimitive.CheckboxItem,
  menuItemCss
);
export const ContextMenuCheckboxItem = forwardRef<
  ElementRef<typeof StyledCheckboxItem>,
  ComponentProps<typeof StyledCheckboxItem> & { icon?: ReactNode }
>(({ children, icon = <MenuCheckedIcon />, ...props }, forwardedRef) => (
  <StyledCheckboxItem withIndicator {...props} ref={forwardedRef}>
    <Indicator>{icon}</Indicator>
    {children}
  </StyledCheckboxItem>
));
ContextMenuCheckboxItem.displayName = "ContextMenuCheckboxItem";

export const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

export const ContextMenuGroup = ContextMenuPrimitive.Group;
