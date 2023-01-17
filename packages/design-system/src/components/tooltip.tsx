import React, { Ref, Fragment, type ComponentProps } from "react";
import { styled } from "../stitches.config";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Box } from "./box";
import { Paragraph } from "./paragraph";
import type { CSS } from "../stitches.config";
import { theme } from "../stitches.config";

export type TooltipProps = ComponentProps<typeof TooltipPrimitive.Root> &
  ComponentProps<typeof TooltipPrimitive.Content> & {
    children: React.ReactElement;
    content: React.ReactNode;
    multiline?: boolean;
    delayDuration?: number;
    disableHoverableContent?: boolean;
    css?: CSS;
  };

const Content = styled(TooltipPrimitive.Content, {
  backgroundColor: theme.colors.hiContrast,
  color: theme.colors.loContrast,
  borderRadius: theme.borderRadius[4],
  padding: `${theme.spacing[3]} ${theme.spacing[5]}`,
  zIndex: theme.zIndices[1],
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
  fill: theme.colors.hiContrast,
  marginTop: -0.5,
});

export const Tooltip = React.forwardRef(
  (
    {
      children,
      content,
      defaultOpen,
      multiline,
      delayDuration,
      disableHoverableContent,
      open,
      onOpenChange,
      triggerProps,
      ...props
    }: TooltipProps & {
      triggerProps?: ComponentProps<typeof TooltipPrimitive.Trigger>;
    },
    ref: Ref<HTMLDivElement>
  ) => {
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
        <TooltipPrimitive.Trigger asChild {...triggerProps}>
          {children}
        </TooltipPrimitive.Trigger>
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
            <Box css={{ color: theme.colors.transparentExtreme }}>
              <Arrow offset={5} width={11} height={5} />
            </Box>
          </Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    );
  }
);

Tooltip.displayName = "Tooltip";

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
