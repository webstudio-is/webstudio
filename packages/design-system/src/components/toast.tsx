import type { JSX } from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import hotToast, {
  resolveValue,
  useToaster,
  type Toast as HotToast,
  type ToastOptions,
} from "react-hot-toast/headless";
import { keyframes, rawTheme, styled, type CSS } from "../stitches.config";
import { Box } from "./box";
import { theme } from "../stitches.config";
import { Grid } from "./grid";
import { Text } from "./text";
import { Flex } from "./flex";
import { Tooltip } from "./tooltip";
import { Button } from "./button";
import { CopyIcon, LargeXIcon } from "@webstudio-is/icons";

const ANIMATION_SLIDE_LENGTH = 30;

const hide = keyframes({
  "0%": { opacity: 1 },
  "100%": { opacity: 0 },
});

const slideIn = keyframes({
  from: { transform: `translateY(calc(0px + ${ANIMATION_SLIDE_LENGTH}px))` },
  to: { transform: "translateY(0)" },
});

const swipeOut = keyframes({
  from: { transform: "translateX(var(--radix-toast-swipe-end-x))" },
  to: { transform: `translateX(calc(100% + ${ANIMATION_SLIDE_LENGTH}px))` },
});

const StyledViewport = styled(ToastPrimitive.Viewport, {
  position: "absolute",
  top: 0,
  right: 0,
  display: "flex",
  flexDirection: "column",
  padding: theme.spacing[5],
  gap: theme.spacing[5],
  minWidth: 200,
  width: "auto",
  maxWidth: "100vw",
  margin: 0,
  listStyle: "none",
  zIndex: theme.zIndices.max,
  outline: "none",
});

const AnimatedToast = styled(ToastPrimitive.Root, {
  "@media (prefers-reduced-motion: no-preference)": {
    '&[data-state="open"]': {
      animation: `${slideIn} 250ms cubic-bezier(0.16, 1, 0.3, 1)`,
    },
    '&[data-state="closed"]': {
      animation: `${hide} 105ms ease-in`,
    },
    '&[data-swipe="move"]': {
      transform: "translateX(var(--radix-toast-swipe-move-x))",
    },
    '&[data-swipe="cancel"]': {
      transform: "translateX(0)",
      transition: "transform 200ms ease-out",
    },
    '&[data-swipe="end"]': {
      animation: `${swipeOut} 150ms ease-out`,
    },
  },
});

const borderAccentBackgroundColor = "--ws-toast-border-accent-background-color";
const backgroundColor = "--ws-toast-background-color";
const borderColor = "--ws-toast-border-color";
const iconColor = "--ws-toast-icon-color";

const ToastVariants = styled("div", {
  [borderAccentBackgroundColor]: theme.colors.foregroundMain,
  [backgroundColor]: theme.colors.backgroundNeutralNotification,
  [borderColor]: theme.colors.borderNeutral,
  [iconColor]: theme.colors.foregroundMain,

  variants: {
    variant: {
      neutral: {},
      warning: {
        [backgroundColor]: theme.colors.backgroundAlertNotification,
        [borderAccentBackgroundColor]: theme.colors.backgroundAlertMain,
        [borderColor]: theme.colors.backgroundAlertMain,
        [iconColor]: theme.colors.backgroundAlertMain,
      },
      error: {
        [backgroundColor]: theme.colors.backgroundDestructiveNotification,
        [borderAccentBackgroundColor]: theme.colors.backgroundDestructiveMain,
        [borderColor]: theme.colors.backgroundDestructiveMain,
        [iconColor]: theme.colors.foregroundDestructive,
      },
      success: {
        [backgroundColor]: theme.colors.backgroundSuccessNotification,
        [borderAccentBackgroundColor]: theme.colors.backgroundSuccessMain,
        [borderColor]: theme.colors.backgroundSuccessMain,
        [iconColor]: theme.colors.foregroundSuccess,
      },
    },
  },
});

type ToastVariant = React.ComponentProps<typeof ToastVariants>["variant"];

const cssVar = (name: string) => `var(${name})`;

const InternalToast = ({
  children,
  variant,
  icon,
  sideButtons,
}: {
  children: React.ReactNode;
  variant?: ToastVariant;
  icon?: React.ReactNode;
  sideButtons: React.ReactNode;
}) => {
  return (
    <ToastVariants variant={variant}>
      <Grid
        css={{
          display: "grid",
          gridTemplateColumns: "8px 1fr",
          pointerEvents: "all",
        }}
      >
        <Box
          css={{
            backgroundColor: cssVar(borderAccentBackgroundColor),
            borderTopLeftRadius: theme.borderRadius[5],
            borderBottomLeftRadius: theme.borderRadius[5],
          }}
        ></Box>
        <Grid
          gap={"3"}
          align={"center"}
          css={{
            backgroundColor: cssVar(backgroundColor),
            padding: theme.panel.padding,
            gridTemplateColumns: icon ? "auto 1fr auto" : "1fr auto",
            borderBottomRightRadius: theme.borderRadius[5],
            borderTopRightRadius: theme.borderRadius[5],
            border: `1px solid ${cssVar(borderColor)}`,
            borderLeft: "none",
          }}
        >
          <Box
            css={{
              color: cssVar(iconColor),
              display: icon ? "contents" : "none",
            }}
          >
            {icon}
          </Box>

          <Grid gap={"1"}>
            <ToastPrimitive.Description asChild>
              <Text
                css={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  display: "-webkit-box",
                  "-webkit-line-clamp": 20,
                  "-webkit-box-orient": "vertical",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                variant={"labelsSentenceCase"}
              >
                {children}
              </Text>
            </ToastPrimitive.Description>
          </Grid>

          {sideButtons}
        </Grid>
      </Grid>
    </ToastVariants>
  );
};

export const Toast = ({
  children,
  variant,
  icon,
  onClose,
  onCopy,
}: {
  onClose?: () => void;
  onCopy?: () => void;
  children: React.ReactNode;
  variant?: ToastVariant;
  icon?: React.ReactNode;
}) => {
  const sideButtons = (css: CSS) => (
    <Flex css={css} wrap="wrapReverse">
      <Tooltip content={"Copy to clipboard"}>
        <Button
          css={{
            "&[data-state=auto]:hover": {
              background: "rgba(0, 0, 0, 0.07)",
            },
            "&[data-state=auto]:active": {
              background: "rgba(0, 0, 0, 0.04)",
            },
          }}
          color="ghost"
          onClick={() => {
            onCopy?.();
          }}
          prefix={<CopyIcon />}
        ></Button>
      </Tooltip>
      <Tooltip content={"Close"}>
        <Button
          css={{
            "&[data-state=auto]:hover": {
              background: "rgba(0, 0, 0, 0.07)",
            },
            "&[data-state=auto]:active": {
              background: "rgba(0, 0, 0, 0.04)",
            },
          }}
          color="ghost"
          onClick={() => {
            onClose?.();
          }}
          prefix={<LargeXIcon />}
        ></Button>
      </Tooltip>
    </Flex>
  );

  const buttonSize = Number.parseFloat(rawTheme.spacing[12]);
  // Change the side button layout to vertical at a specific container size.
  const layoutThreshold = `90px`;

  /**
   * Using `container-type: size` enables the @container (min-height) media query.
   * This applies layout, style, and size containment to the container,
   * meaning the element's size is computed in isolation, ignoring its child elements.
   * We use `visibility: hidden` elements to set the container's size,
   * placing all elements inside the same grid cell.
   */
  return (
    <Grid
      css={{
        width: theme.spacing[33],
      }}
    >
      {/* Toast with a horizontal layout for side buttons */}
      <Box
        css={{
          gridColumn: "1",
          gridRow: "1",
          // Vertical button layout is applied after this height, so it must not affect the container height.
          maxHeight: layoutThreshold,
          overflow: "hidden",
          // Element is used to set the container size.
          visibility: "hidden",
        }}
      >
        <InternalToast
          variant={variant}
          icon={icon}
          sideButtons={sideButtons({})}
        >
          {children}
        </InternalToast>
      </Box>

      {/* Toast with a vertical layout for side buttons. */}
      <Box
        css={{
          gridColumn: "1",
          gridRow: "1",
          // Element is used to set the container size.
          visibility: "hidden",
        }}
      >
        <InternalToast
          variant={variant}
          icon={icon}
          sideButtons={sideButtons({
            width: "min-content",
            // Ensure buttons do not affect the container height; only the content should.
            maxHeight: buttonSize,
          })}
        >
          {children}
        </InternalToast>
      </Box>

      {/* Container with Toast */}
      <Grid
        css={{
          gridColumn: "1",
          gridRow: "1",
          containerType: "size",
        }}
      >
        <InternalToast
          variant={variant}
          icon={
            icon ? (
              <Box
                css={{
                  [`@container (min-height: ${layoutThreshold})`]: {
                    alignSelf: "start",
                  },
                }}
              >
                {icon}
              </Box>
            ) : undefined
          }
          sideButtons={sideButtons({
            [`@container (min-height: ${layoutThreshold})`]: {
              width: "min-content",
              alignSelf: "start",
            },
          })}
        >
          {children}
        </InternalToast>
      </Grid>
    </Grid>
  );
};

const mapToVariant: Record<HotToast["type"], ToastVariant> = {
  success: "success",
  error: "error",
  loading: "neutral",
  blank: "neutral",
  custom: "warning",
};

export const Toaster = () => {
  const { toasts, handlers } = useToaster();
  const { startPause, endPause } = handlers;

  return (
    <ToastPrimitive.ToastProvider>
      {toasts.map((toastData) => {
        const toastVariant = mapToVariant[toastData.type];
        const children = resolveValue(toastData.message, toastData);

        return (
          <AnimatedToast
            key={toastData.id}
            onMouseEnter={startPause}
            onMouseLeave={endPause}
            duration={toastData.duration}
          >
            <Toast
              variant={toastVariant}
              onClose={() => {
                hotToast.remove(toastData.id);
              }}
              onCopy={() => {
                navigator.clipboard.writeText(children?.toString() ?? "");
              }}
              icon={toastData.icon}
            >
              {children}
            </Toast>
          </AnimatedToast>
        );
      })}
      <StyledViewport />
    </ToastPrimitive.ToastProvider>
  );
};

type Options = Pick<ToastOptions, "duration" | "id" | "icon">;

export const toast = {
  info: (value: JSX.Element | string, options?: Options) =>
    hotToast(value, options),
  error: (value: JSX.Element | string, options?: Options) =>
    hotToast.error(value, options),
  warn: (value: JSX.Element | string, options?: Options) =>
    hotToast.custom(value, options),
  success: (value: JSX.Element | string, options?: Options) =>
    hotToast.success(value, options),
};
