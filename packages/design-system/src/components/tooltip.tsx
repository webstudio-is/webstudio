import React, { Ref, ComponentProps, Fragment } from "react";
import { styled } from "../stitches.config";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Box } from "./box";
import { Paragraph } from "./paragraph";
import type { CSS } from "../stitches.config";

type TooltipProps = ComponentProps<typeof TooltipPrimitive.Root> &
  ComponentProps<typeof TooltipPrimitive.Content> & {
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
  borderRadius: "$borderRadius$4",
  padding: "$spacing$3 $spacing$5",
  zIndex: "$1",
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
  if (!content) {
    return children;
  }
  return (
    <TooltipPrimitive.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      delayDuration={delayDuration}
      disableHoverableContent={disableHoverableContent}
    >
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <Content
          ref={ref}
          side="top"
          align="center"
          sideOffset={5}
          {...props}
          multiline={multiline}
        >
          <Paragraph>{content}</Paragraph>
          <Box css={{ color: "$transparentExtreme" }}>
            <Arrow offset={5} width={11} height={5} />
          </Box>
        </Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
});

export const InputErrorsTooltip = ({
  errors,
  children,
  ...rest
}: Omit<TooltipProps, "content"> & {
  errors?: string[];
  children: ComponentProps<typeof Tooltip>["children"];
}) => {
  const content = errors?.map((error, index) => (
    <Fragment key={index}>
      {index > 0 && <br />}
      {error}
    </Fragment>
  ));
  return (
    // We intentionally always pass non empty content to avoid optimization inside Tooltip
    // where it renders {children} directly if content is empty.
    // If this optimization accur, the input will remount which will cause focus loss
    // and current value loss.
    <Tooltip
      {...rest}
      content={content || " "}
      open={errors !== undefined && errors.length !== 0}
      side="right"
    >
      {children}
    </Tooltip>
  );
};
