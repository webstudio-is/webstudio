import { styled } from "../stitches.config";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { theme } from "../stitches.config";

export const Toggle = styled(TogglePrimitive.Root, {
  // Reset
  alignItems: "center",
  appearance: "none",
  borderWidth: "0",
  boxSizing: "border-box",
  display: "inline-flex",
  flexShrink: 0,
  fontFamily: "inherit",
  fontSize: theme.fontSize[4],
  justifyContent: "center",
  lineHeight: "1",
  outline: "none",
  padding: "0",
  textDecoration: "none",
  userSelect: "none",
  WebkitTapHighlightColor: "transparent",
  color: theme.colors.hiContrast,
  "&::before": {
    boxSizing: "border-box",
  },
  "&::after": {
    boxSizing: "border-box",
  },
  height: theme.spacing[11],
  width: theme.spacing[11],
  backgroundColor: "transparent",
  "@hover": {
    "&:hover": {
      backgroundColor: theme.colors.slateA3,
    },
  },
  "&:active": {
    backgroundColor: theme.colors.slateA4,
  },
  "&:focus": {
    boxShadow: `inset 0 0 0 1px ${theme.colors.slateA8}, 0 0 0 1px ${theme.colors.slateA8}`,
    zIndex: 1,
  },

  '&[data-state="on"]': {
    backgroundColor: theme.colors.slateA5,
    "@hover": {
      "&:hover": {
        backgroundColor: theme.colors.slateA5,
      },
    },
    "&:active": {
      backgroundColor: theme.colors.slateA7,
    },
  },

  variants: {
    shape: {
      circle: {
        borderRadius: theme.borderRadius.round,
      },
      square: {
        borderRadius: theme.borderRadius[4],
      },
    },
  },
});
