import type { Ref, ComponentProps, ReactNode, ReactElement } from "react";
import { Fragment, forwardRef, useEffect } from "react";
import { styled } from "../stitches.config";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { useControllableState } from "@radix-ui/react-use-controllable-state";
import { Box } from "./box";
import { Text } from "./text";
import type { CSS } from "../stitches.config";
import { theme } from "../stitches.config";
import { disableCanvasPointerEvents } from "../utilities";

export const TooltipProvider = TooltipPrimitive.TooltipProvider;

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
  borderRadius: theme.borderRadius[7],
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
      open: openProp,
      onOpenChange,
      triggerProps,
      ...props
    }: TooltipProps & {
      triggerProps?: ComponentProps<typeof TooltipPrimitive.Trigger>;
    },
    ref: Ref<HTMLDivElement>
  ) => {
    // We need to intercept tooltip open
    const [open = false, setOpen] = useControllableState({
      prop: openProp,
      defaultProp: defaultOpen,
      onChange: (open) => {
        onOpenChange?.(open);
      },
    });

    /**
     * When the mouse leaves Tooltip.Content and moves over an iframe, the Radix Tooltip stays open.
     * This happens because Radix's internal grace area relies on the pointermove event, which isn't triggered over iframes.
     * The current workaround is to set pointer-events: none on the canvas when the tooltip is open.
     **/
    useEffect(() => {
      if (open) {
        const enableCanvasPointerEvents = disableCanvasPointerEvents();
        return () => {
          enableCanvasPointerEvents?.();
        };
      }
    }, [open]);

    if (!content) {
      return children;
    }

    return (
      <TooltipPrimitive.Root
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={setOpen}
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
            sideOffset={2}
            collisionPadding={8}
            arrowPadding={8}
            {...props}
          >
            {typeof content === "string" ? <Text>{content}</Text> : content}
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
  side,
  css,
  ...rest
}: Omit<TooltipProps, "content"> & {
  errors?: string[];
  children: ComponentProps<typeof Tooltip>["children"];
  side?: ComponentProps<typeof Tooltip>["side"];
}) => {
  const content = errors?.map((error, index) => (
    <Fragment key={index}>
      {index > 0 && <br />}
      <Text>{error}</Text>
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
      side={side ?? "right"}
      css={css}
    >
      {children}
    </Tooltip>
  );
};
