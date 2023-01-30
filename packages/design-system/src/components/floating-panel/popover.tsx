import React, { type ComponentProps, type Ref, type ReactNode } from "react";
import * as Primitive from "@radix-ui/react-popover";
import { css, theme } from "../../stitches.config";
import { Title } from "../title";
import { floatingPanelStyles, CloseButton, TitleSlot } from "./shared";

export const Root = Primitive.Root;

const contentStyles = css(floatingPanelStyles, {
  minWidth: theme.spacing[28],
  maxWidth: "max-content",
});

export const Content = React.forwardRef(
  (
    { children, className, ...props }: ComponentProps<typeof Primitive.Content>,
    ref: Ref<HTMLDivElement>
  ) => (
    <Primitive.Portal>
      <Primitive.Content
        sideOffset={4}
        collisionPadding={4}
        className={contentStyles({ className })}
        {...props}
        ref={ref}
      >
        {children}
      </Primitive.Content>
    </Primitive.Portal>
  )
);
Content.displayName = "Content";

const PopoverTitle = ({
  children,
  closeLabel = "Close dialog",
}: {
  children: ReactNode;
  closeLabel?: string;
}) => (
  <TitleSlot>
    <Title
      suffix={
        <Primitive.Close asChild>
          <CloseButton aria-label={closeLabel} />
        </Primitive.Close>
      }
    >
      {children}
    </Title>
  </TitleSlot>
);
export { PopoverTitle as Title };

export const Trigger = Primitive.Trigger;
export const Close = Primitive.Close;
