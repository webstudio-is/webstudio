import {
  type ComponentProps,
  type ReactNode,
  type Ref,
  forwardRef,
} from "react";
import * as Primitive from "@radix-ui/react-popover";
import { css, theme, styled, type CSS } from "../stitches.config";
import { Separator } from "./separator";
import { PanelTitle } from "./panel-title";
import { Flex } from "./flex";
import { Button } from "./button";
import { XIcon } from "@webstudio-is/icons";

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
  overflow: "clip",
  "&:focus": {
    // override browser default
    outline: "none",
  },
});

const titleSlotStyle = css({
  // We put title at the bottom in DOM to make the close button last in the TAB order
  // But visually we want it to be first
  order: -1,
});

export const PopoverTitle = ({
  children,
  suffix,
  ...rest
}: ComponentProps<typeof PanelTitle> & {
  suffix?: ReactNode;
  closeLabel?: string;
}) => (
  <div className={titleSlotStyle()}>
    <PanelTitle {...rest} suffix={suffix ?? <PopoverClose />}>
      {children}
    </PanelTitle>
    <Separator />
  </div>
);

export const PopoverTitleActions = ({ children }: { children: ReactNode }) => {
  return <Flex gap="1">{children}</Flex>;
};

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

export const PopoverClose = forwardRef(
  (
    { children, ...props }: ComponentProps<typeof Button>,
    ref: Ref<HTMLButtonElement>
  ) => (
    <Primitive.Close asChild>
      {children ?? (
        <Button
          color="ghost"
          prefix={<XIcon />}
          aria-label="Close"
          {...props}
          ref={ref}
        />
      )}
    </Primitive.Close>
  )
);
PopoverClose.displayName = "PopoverClose";

export const PopoverMenuItemRightSlot = styled("span", {
  marginLeft: "auto",
  display: "flex",
});

export const PopoverSeparator = styled(Separator);
