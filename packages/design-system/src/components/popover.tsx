import React, { useState } from "react";
import { Cross1Icon } from "@webstudio-is/icons";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Box } from "./box";
import { panelStyles } from "./panel";
import { Flex } from "./flex";
import { IconButton } from "./icon-button";
import { Text } from "./text";
import { Separator } from "./separator";
import { styled, CSS } from "../stitches.config";

type PopoverProps = React.ComponentProps<typeof PopoverPrimitive.Root> & {
  children: React.ReactNode;
};

export const Popover = ({ children, ...props }: PopoverProps) => {
  return <PopoverPrimitive.Root {...props}>{children}</PopoverPrimitive.Root>;
};

const StyledContent = styled(PopoverPrimitive.Content, panelStyles, {
  minWidth: 200,
  minHeight: "$6",
  maxWidth: 265,
  "&:focus": {
    outline: "none",
  },
});

type PopoverContentPrimitiveProps = React.ComponentProps<
  typeof PopoverPrimitive.Content
>;

type PopoverContentProps = PopoverContentPrimitiveProps & {
  css?: CSS;
  hideArrow?: boolean;
};

export const PopoverContent = React.forwardRef<
  React.ElementRef<typeof StyledContent>,
  PopoverContentProps
>(({ children, hideArrow, ...props }, fowardedRef) => (
  <StyledContent
    sideOffset={4}
    collisionPadding={4}
    {...props}
    ref={fowardedRef}
  >
    {children}
    {!hideArrow && (
      <Box css={{ color: "$panel" }}>
        <PopoverPrimitive.Arrow
          width={11}
          height={5}
          offset={5}
          style={{ fill: "currentColor" }}
        />
      </Box>
    )}
  </StyledContent>
));
PopoverContent.displayName = "PopoverContent";

type PopoverHeaderProps = {
  title: string;
};

export const PopoverHeader = ({ title }: PopoverHeaderProps) => {
  return (
    <>
      <Flex
        css={{ height: 40, paddingLeft: "$3" }}
        align="center"
        justify="between"
      >
        <Text variant="title">{title}</Text>
        <PopoverClose asChild>
          <IconButton
            size="1"
            css={{
              marginRight: "$2",
              "&:not(:hover):focus": { background: "none" },
            }}
            aria-label="Close"
            autoFocus={false}
          >
            <Cross1Icon />
          </IconButton>
        </PopoverClose>
      </Flex>
      <Separator css={{ height: 2 }} />
    </>
  );
};

export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverClose = PopoverPrimitive.Close;
export const PopoverPortal = PopoverPrimitive.Portal;

export const ModalPopover = ({
  title,
  content,
  children,
}: {
  title: string;
  content: JSX.Element;
  children: JSX.Element;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} modal>
      <PopoverTrigger
        asChild
        onClick={() => {
          setIsOpen(true);
        }}
      >
        {children}
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent
          sideOffset={220}
          side="right"
          hideArrow
          css={{ backgroundColor: "$loContrast" }}
        >
          <PopoverHeader title={title} />
          {content}
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
};
