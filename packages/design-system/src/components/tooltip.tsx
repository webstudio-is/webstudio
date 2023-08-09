import type { Ref, ComponentProps, ReactNode, ReactElement } from "react";
import { Fragment, forwardRef, useEffect, useRef } from "react";
import { styled } from "../stitches.config";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { useControllableState } from "@radix-ui/react-use-controllable-state";
import { Box } from "./box";
import { Text } from "./text";
import type { CSS } from "../stitches.config";
import { theme } from "../stitches.config";
import warnOnce from "warn-once";
import {
  disableCanvasPointerEvents,
  enableCanvasPointerEvents,
} from "../utilities";

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

let openTooltipsCount = 0;

/**
 * When the mouse leaves Tooltip.Content and moves over an iframe, the Radix Tooltip stays open.
 * This happens because Radix's internal grace area relies on the pointermove event, which isn't triggered over iframes.
 * The current workaround is to set pointer-events: none on the canvas when the tooltip is open.
 **/
const handleTooltipOpenChange = (open: boolean) => {
  if (openTooltipsCount < 0) {
    // Should be impossible but in case if we've missed a tooltip open/close event,
    // just enable events and stop this algorithm, to preserve system in working state
    warnOnce(true, "Tooltip counter can't be less than 0");
    enableCanvasPointerEvents();
    return;
  }

  // Multiple tooltips can open simultaneously. Use a counter instead of a boolean to manage them.
  openTooltipsCount = openTooltipsCount + (open ? 1 : -1);

  if (openTooltipsCount > 0) {
    disableCanvasPointerEvents();
  }

  enableCanvasPointerEvents();
};

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
    const isOpenRef = useRef(false);

    // We need to intercept tooltip open
    const [open = false, setOpen] = useControllableState({
      prop: openProp,
      defaultProp: defaultOpen,
      onChange: (open) => {
        onOpenChange?.(open);
      },
    });

    // Manage scenarios where defaultOpen or open is initially set, or when the tooltip is unmounted.
    useEffect(() => {
      if (isOpenRef.current !== open) {
        handleTooltipOpenChange(open);
        isOpenRef.current = open;
      }

      return () => {
        if (isOpenRef.current) {
          handleTooltipOpenChange(false);
          isOpenRef.current = false;
        }
      };
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
