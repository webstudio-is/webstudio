import * as ToastPrimitive from "@radix-ui/react-toast";
import hotToast, {
  resolveValue,
  useToaster,
  type Toast as HotToast,
} from "react-hot-toast/headless";
import { keyframes, styled } from "../stitches.config";
import { Box } from "./box";
import { theme } from "../stitches.config";
import { Grid } from "./grid";
import { AlertCircleIcon } from "@webstudio-is/icons";
import { Text } from "./text";
import { Tooltip } from "./tooltip";
import { useState } from "react";

const VIEWPORT_PADDING = 20;

const hide = keyframes({
  "0%": { opacity: 1 },
  "100%": { opacity: 0 },
});

const slideIn = keyframes({
  from: { transform: `translateY(calc(0px + ${VIEWPORT_PADDING}px))` },
  to: { transform: "translateY(0)" },
});

const swipeOut = keyframes({
  from: { transform: "translateX(var(--radix-toast-swipe-end-x))" },
  to: { transform: `translateX(calc(100% + ${VIEWPORT_PADDING}px))` },
});

const StyledViewport = styled(ToastPrimitive.Viewport, {
  position: "absolute",
  top: 0,
  right: 0,
  display: "flex",
  flexDirection: "column",
  padding: VIEWPORT_PADDING,
  gap: VIEWPORT_PADDING,
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
  width: theme.spacing[32],
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
    },
  },
});

type ToastVariant = React.ComponentProps<typeof ToastVariants>["variant"];

const cssVar = (name: string) => `var(${name})`;

export const Toast = ({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant?: ToastVariant;
}) => {
  const [copied, setCopied] = useState(false);

  console.log(copied ? "Copied to Clipboard" : "Click to Copy");

  return (
    <Tooltip
      content={copied ? "Copied to Clipboard" : "Click to Copy"}
      onClick={() => {
        navigator.clipboard.writeText(children?.toString() ?? "");
        setCopied(true);
      }}
    >
      <ToastVariants variant={variant}>
        <Grid
          css={{
            display: "grid",
            gridTemplateColumns: "8px 1fr",
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
              padding: theme.spacing[9],
              gridTemplateColumns: "auto 1fr",
              borderBottomRightRadius: theme.borderRadius[5],
              borderTopRightRadius: theme.borderRadius[5],
              border: `1px solid ${cssVar(borderColor)}`,
              borderLeft: "none",
            }}
          >
            <Box css={{ color: cssVar(iconColor) }}>
              <AlertCircleIcon size={24} />
            </Box>

            <Grid gap={"1"}>
              <ToastPrimitive.Description asChild>
                <Text variant={"labelsSentenceCase"}>{children}</Text>
              </ToastPrimitive.Description>
            </Grid>
          </Grid>
        </Grid>
      </ToastVariants>
    </Tooltip>
  );
};

const mapToVariant: Record<HotToast["type"], ToastVariant> = {
  success: "neutral",
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

        return (
          <AnimatedToast
            key={toastData.id}
            onMouseEnter={startPause}
            onMouseLeave={endPause}
            onClick={() => {
              hotToast.remove(toastData.id);
            }}
            duration={toastData.duration}
          >
            <Toast variant={toastVariant}>
              {resolveValue(toastData.message, toastData)}
            </Toast>
          </AnimatedToast>
        );
      })}
      <StyledViewport />
    </ToastPrimitive.ToastProvider>
  );
};

export const toast = {
  info: hotToast,
  error: hotToast.error,
  success: hotToast.success,
  warn: hotToast.custom,
};
