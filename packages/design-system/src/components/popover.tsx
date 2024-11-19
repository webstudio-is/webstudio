import { type ComponentProps, type Ref, forwardRef } from "react";
import * as Primitive from "@radix-ui/react-popover";
import { css, theme, styled, type CSS } from "../stitches.config";
import { Separator } from "./separator";

export const Popover = Primitive.Root;

export const PopoverPortal = Primitive.Portal;

const contentStyle = css({
  border: `1px solid ${theme.colors.borderMain}`,
  boxShadow: `${theme.shadows.menuDropShadow}, inset 0 0 0 1px ${theme.colors.borderMenuInner}`,
  background: theme.colors.backgroundMenu,
  borderRadius: theme.borderRadius[6],
  display: "flex",
  flexDirection: "column",
  maxWidth: "max-content",
  "&:focus": {
    // override browser default
    outline: "none",
  },
});

export const PopoverContent = forwardRef(
  (
    {
      children,
      className,
      css,
      sideOffset,
      ...props
    }: ComponentProps<typeof Primitive.Content> & {
      css?: CSS;
    },
    ref: Ref<HTMLDivElement>
  ) => (
    <Primitive.Portal>
      <Primitive.Content
        sideOffset={sideOffset ?? 4}
        collisionPadding={4}
        className={contentStyle({ className, css })}
        {...props}
        ref={ref}
      >
        {children}
      </Primitive.Content>
    </Primitive.Portal>
  )
);
PopoverContent.displayName = "PopoverContent";

export const PopoverTrigger = Primitive.Trigger;
export const PopoverClose = Primitive.Close;

export const PopoverMenuItemRightSlot = styled("span", {
  marginLeft: "auto",
  display: "flex",
});

export const PopoverSeparator = styled(Separator);
