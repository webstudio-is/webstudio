import { styled } from "../stitches.config";
import * as TogglePrimitive from "@radix-ui/react-toggle";

export const SimpleToggle = styled(TogglePrimitive.Root, {
  // Reset
  alignItems: "center",
  appearance: "none",
  borderWidth: "0",
  boxSizing: "border-box",
  display: "inline-flex",
  flexShrink: 0,
  fontFamily: "inherit",
  fontSize: "$fontSize$4",
  justifyContent: "center",
  lineHeight: "1",
  outline: "none",
  padding: "0",
  textDecoration: "none",
  userSelect: "none",
  WebkitTapHighlightColor: "transparent",
  color: "$hiContrast",
  "&::before": {
    boxSizing: "border-box",
  },
  "&::after": {
    boxSizing: "border-box",
  },
  height: "$spacing$11",
  width: "$spacing$11",
  backgroundColor: "transparent",
  "@hover": {
    "&:hover": {
      backgroundColor: "$slateA3",
    },
  },
  "&:active": {
    backgroundColor: "$slateA4",
  },
  "&:focus": {
    boxShadow: "inset 0 0 0 1px $slateA8, 0 0 0 1px $slateA8",
    zIndex: 1,
  },

  '&[data-state="on"]': {
    backgroundColor: "$slateA5",
    "@hover": {
      "&:hover": {
        backgroundColor: "$slateA5",
      },
    },
    "&:active": {
      backgroundColor: "$slateA7",
    },
  },

  variants: {
    shape: {
      circle: {
        borderRadius: "$round",
      },
      square: {
        borderRadius: "$1",
      },
    },
  },
});
