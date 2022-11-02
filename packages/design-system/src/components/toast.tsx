import * as ToastPrimitive from "@radix-ui/react-toast";
import toast, { useToaster } from "react-hot-toast/headless";
import type { ZodError } from "zod";
import { keyframes, styled } from "../stitches.config";
import {
  CheckCircledIcon,
  CrossCircledIcon,
  InfoCircledIcon,
} from "@webstudio-is/icons";
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
  boxShadow: "0px 2px 7px rgba(0, 0, 0, 0.1), 0px 5px 17px rgba(0, 0, 0, 0.15)",
  padding: "$3",
  display: "flex",
  maxWidth: 250,
  gap: "$3",
  alignItems: "center",
  color: "$highContrast",
  fontWeight: 500,
  fontSize: "$2",
  background: "$loContrast",

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
  variants: {
    variant: {
      error: {
        background: "$red9",
        color: "$loContrast",
      },
      success: {
        background: "$green10",
        color: "$loContrast",
      },
      blank: {
        background: "$blue11",
        color: "$loContrast",
      },
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
          <Box
            css={{
              svg: {
                width: "$5",
                height: "$5",
              },
            }}
          >
            {toast.type === "success" && <CheckCircledIcon />}
            {toast.type === "error" && <CrossCircledIcon />}
            {toast.type === "blank" && <InfoCircledIcon />}
          </Box>
          <StyledTitle>{toast.message}</StyledTitle>
        </StyledToast>
      ))}
      <StyledViewport />
    </ToastPrimitive.ToastProvider>
  );
};

export { toast };

export const toastNonFieldErrors = (
  errors: ZodError["formErrors"],
  knownFields?: string[]
) => {
  for (const message of errors.formErrors) {
    toast.error(message);
  }

  if (knownFields !== undefined) {
    for (const fieldName in errors.fieldErrors) {
      if (knownFields.includes(fieldName) === false) {
        for (const message of errors.fieldErrors[fieldName] as string[]) {
          toast.error(`${fieldName}: ${message}`);
        }
      }
    }
  }
};
