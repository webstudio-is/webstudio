import React, { Ref } from "react";
import { styled } from "../stitches.config";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Box } from "./box";
import { __DEPRECATED__Text } from "./__DEPRECATED__/text";
import type { CSS } from "../stitches.config";

type TooltipProps = React.ComponentProps<typeof TooltipPrimitive.Root> &
  React.ComponentProps<typeof TooltipPrimitive.Content> & {
    children: React.ReactElement;
    content: React.ReactNode;
    multiline?: boolean;
    delayDuration?: number;
    disableHoverableContent?: boolean;
    css?: CSS;
  };

const Content = styled(TooltipPrimitive.Content, {
  backgroundColor: "$hiContrast",
  color: "$loContrast",
  borderRadius: "$1",
  padding: "$1 $2",
  zIndex: "$max",
  position: "relative",

  variants: {
    multiline: {
      true: {
        // @todo make this part of the design system
        maxWidth: 110,
        pb: 7,
      },
    },
  },
});

const Arrow = styled(TooltipPrimitive.Arrow, {
  fill: "$hiContrast",
  strokeWidth: "$1",
  marginTop: -0.5,
});

export const Tooltip = React.forwardRef(function TooltipWrapper(
  {
    children,
    content,
    open,
    defaultOpen,
    onOpenChange,
    multiline,
    delayDuration,
    disableHoverableContent,
    ...props
  }: TooltipProps,
  ref: Ref<HTMLDivElement>
) {
  if (!content) return children;
  return (
    <TooltipPrimitive.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      delayDuration={delayDuration}
      disableHoverableContent={disableHoverableContent}
    >
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>

      <Content
        ref={ref}
        side="top"
        align="center"
        sideOffset={5}
        {...props}
        multiline={multiline}
      >
        <__DEPRECATED__Text
          size="1"
          as="p"
          css={{
            color: "currentColor",
            lineHeight: multiline ? "$5" : undefined,
          }}
        >
          {content}
        </__DEPRECATED__Text>
        <Box css={{ color: "$transparentExtreme" }}>
          <Arrow offset={5} width={11} height={5} />
        </Box>
      </Content>
    </TooltipPrimitive.Root>
  );
});
