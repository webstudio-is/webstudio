import * as ToastPrimitive from "@radix-ui/react-toast";
import BaseToast, { useToaster } from "react-hot-toast/headless";
import { keyframes, styled } from "../stitches.config";
import { CheckIcon, Cross1Icon } from "@webstudio-is/icons";
import { Box } from "./box";

const VIEWPORT_PADDING = "$2";

const hide = keyframes({
  "0%": { opacity: 1 },
  "100%": { opacity: 0 },
});

const slideIn = keyframes({
  from: { transform: `translateY(calc(0px - ${VIEWPORT_PADDING}px))` },
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
  zIndex: "$max",
  outline: "none",
});

const StyledToast = styled(ToastPrimitive.Root, {
  borderRadius: 6,
  boxShadow:
    "hsl(206 22% 7% / 35%) 0 $space$2 $space$6 -$space$2, hsl(206 22% 7% / 20%) 0 $space$2 $space$4 -$space$3",
  padding: "$3",
  display: "flex",
  gap: "$1",
  alignItems: "center",
  color: "$highContrast",
  fontWeight: 500,
  fontSize: "$3",
  background: "$loContrast",

  "@media (prefers-reduced-motion: no-preference)": {
    '&[data-state="open"]': {
      animation: `${slideIn} 250ms cubic-bezier(0.16, 1, 0.3, 1)`,
    },
    '&[data-state="closed"]': {
      animation: `${hide} 100ms ease-in`,
    },
    '&[data-swipe="move"]': {
      transform: "translateX(var(--radix-toast-swipe-move-x))",
    },
    '&[data-swipe="cancel"]': {
      transform: "translateX(0)",
      transition: "transform 200ms ease-out",
    },
    '&[data-swipe="end"]': {
      animation: `${swipeOut} 100ms ease-out`,
    },
  },
  variants: {
    variant: {
      error: {
        color: "$red11",
      },
      success: {
        color: "$green9",
      },
      blank: {},
      custom: {},
      loading: {},
    },
  },
});

const StyledTitle = styled(ToastPrimitive.Title, {
  marginBottom: "$1",
});

export const Toaster = () => {
  const { toasts, handlers } = useToaster();
  const { startPause, endPause } = handlers;
  return (
    <ToastPrimitive.ToastProvider>
      {toasts.map((toast) => (
        <StyledToast
          variant={toast.type}
          key={toast.id}
          onMouseEnter={startPause}
          onMouseLeave={endPause}
        >
          <Box>
            {toast.type === "success" && <CheckIcon />}
            {toast.type === "error" && <Cross1Icon />}
          </Box>
          <StyledTitle>{toast.message}</StyledTitle>
        </StyledToast>
      ))}
      <StyledViewport />
    </ToastPrimitive.ToastProvider>
  );
};

export const toast = BaseToast;
