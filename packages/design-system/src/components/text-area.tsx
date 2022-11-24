import { styled } from "../stitches.config";

export const TextArea = styled("textarea", {
  // Reset
  appearance: "none",
  borderWidth: "0",
  fontFamily: "inherit",
  margin: "0",
  outline: "none",
  padding: "$spacing$3",
  WebkitTapHighlightColor: "rgba(0,0,0,0)",
  backgroundColor: "$loContrast",
  boxShadow: "inset 0 0 0 1px $colors$muted",
  color: "$hiContrast",
  fontVariantNumeric: "tabular-nums",
  position: "relative",
  minHeight: 80,
  resize: "vertical",

  "&:focus": {
    boxShadow:
      "inset 0px 0px 0px 1px $colors$blue8, 0px 0px 0px 1px $colors$blue8",
    zIndex: "1",
  },
  "&::placeholder": {
    color: "$slate9",
  },
  "&:disabled": {
    pointerEvents: "none",
    backgroundColor: "$slate2",
    color: "$slate8",
    cursor: "not-allowed",
    resize: "none",
    "&::placeholder": {
      color: "$slate7",
    },
  },
  "&:read-only": {
    backgroundColor: "$slate2",
    "&:focus": {
      boxShadow: "inset 0px 0px 0px 1px $colors$slate7",
    },
  },

  variants: {
    size: {
      "1": {
        borderRadius: "$borderRadius$4",
        fontSize: "$fontSize$3",
        lineHeight: "$lineHeight$3",
        px: "$spacing$3",
      },
      "2": {
        borderRadius: "$borderRadius$4",
        fontSize: "$fontSize$3",
        lineHeight: "$lineHeight$4",
        px: "$spacing$3",
      },
      "3": {
        borderRadius: "$borderRadius$6",
        fontSize: "$fontSize$4",
        lineHeight: "23px",
        px: "$spacing$5",
      },
    },
    state: {
      invalid: {
        boxShadow: "inset 0 0 0 1px $colors$red7",
        "&:focus": {
          boxShadow:
            "inset 0px 0px 0px 1px $colors$red8, 0px 0px 0px 1px $colors$red8",
        },
      },
      valid: {
        boxShadow: "inset 0 0 0 1px $colors$green7",
        "&:focus": {
          boxShadow:
            "inset 0px 0px 0px 1px $colors$green8, 0px 0px 0px 1px $colors$green8",
        },
      },
    },
    cursor: {
      default: {
        cursor: "default",
        "&:focus": {
          cursor: "text",
        },
      },
      text: {
        cursor: "text",
      },
    },
  },
  defaultVariants: {
    size: "1",
  },
});
