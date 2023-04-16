import type { Ref, ComponentProps, ReactNode, ReactElement } from "react";
import { Fragment, forwardRef } from "react";
import { styled } from "../stitches.config";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Box } from "./box";
import { DeprecatedParagraph } from "./__DEPRECATED__/paragraph";
import type { CSS } from "../stitches.config";
import { theme } from "../stitches.config";

export type TooltipProps = ComponentProps<typeof TooltipPrimitive.Root> &
  Omit<ComponentProps<typeof Content>, "content"> & {
    children: ReactElement;
    content: ReactNode;
    delayDuration?: number;
    disableHoverableContent?: boolean;
    css?: CSS;
  };

const Content = styled(TooltipPrimitive.Content, {
  backgroundColor: theme.colors.hiContrast,
  color: theme.colors.loContrast,
  borderRadius: theme.borderRadius[4],
  padding: theme.spacing[5],
  zIndex: theme.zIndices[1],
  position: "relative",

  variants: {
    variant: {
      wrapped: {
        maxWidth: theme.spacing["29"],
      },
      large: {
        maxWidth: theme.spacing["32"],
        padding: theme.spacing[9],
      },
    },
  },
});

const Arrow = styled(TooltipPrimitive.Arrow, {
  fill: theme.colors.hiContrast,
  marginTop: -0.5,
});

export const Tooltip = forwardRef(
  (
    {
      children,
      content,
      defaultOpen,
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
          >
            <DeprecatedParagraph>{content}</DeprecatedParagraph>
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
      content={content ?? " "}
      open={errors !== undefined && errors.length !== 0}
      side="right"
    >
      {children}
    </Tooltip>
  );
};
