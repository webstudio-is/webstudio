import { styled } from "../stitches.config";
import { theme } from "../stitches.config";

export const TextArea = styled("textarea", {
  // Reset
  appearance: "none",
  borderWidth: "0",
  fontFamily: "inherit",
  margin: "0",
  outline: "none",
  padding: theme.spacing[3],
  WebkitTapHighlightColor: "rgba(0,0,0,0)",
  backgroundColor: theme.colors.loContrast,
  boxShadow: `inset 0 0 0 1px ${theme.colors.muted}`,
  color: theme.colors.hiContrast,
  fontVariantNumeric: "tabular-nums",
  position: "relative",
  minHeight: 80,
  resize: "vertical",

  "&:focus": {
    boxShadow: `inset 0px 0px 0px 1px ${theme.colors.blue8}, 0px 0px 0px 1px ${theme.colors.blue8}`,
    zIndex: "1",
  },
  "&::placeholder": {
    color: theme.colors.slate9,
  },
  "&:disabled": {
    pointerEvents: "none",
    backgroundColor: theme.colors.slate2,
    color: theme.colors.slate8,
    cursor: "not-allowed",
    resize: "none",
    "&::placeholder": {
      color: theme.colors.slate7,
    },
  },
  "&:read-only": {
    backgroundColor: theme.colors.slate2,
    "&:focus": {
      boxShadow: `inset 0px 0px 0px 1px ${theme.colors.slate7}`,
    },
  },

  variants: {
    size: {
      "1": {
        borderRadius: theme.borderRadius[4],
        fontSize: theme.deprecatedFontSize[3],
        lineHeight: theme.deprecatedLineHeight[3],
        px: theme.spacing[3],
      },
      "2": {
        borderRadius: theme.borderRadius[4],
        fontSize: theme.deprecatedFontSize[3],
        lineHeight: theme.deprecatedLineHeight[4],
        px: theme.spacing[3],
      },
      "3": {
        borderRadius: theme.borderRadius[6],
        fontSize: theme.deprecatedFontSize[4],
        lineHeight: "23px",
        px: theme.spacing[5],
      },
    },
    state: {
      invalid: {
        boxShadow: `inset 0 0 0 1px ${theme.colors.red7}`,
        "&:focus": {
          boxShadow: `inset 0px 0px 0px 1px ${theme.colors.red8}, 0px 0px 0px 1px ${theme.colors.red8}`,
        },
      },
      valid: {
        boxShadow: `inset 0 0 0 1px ${theme.colors.green7}`,
        "&:focus": {
          boxShadow: `inset 0px 0px 0px 1px ${theme.colors.green8}, 0px 0px 0px 1px ${theme.colors.green8}`,
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
