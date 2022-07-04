import { styled } from "../stitches.config";

export const Card = styled("div", {
  appearance: "none",
  border: "none",
  boxSizing: "border-box",
  font: "inherit",
  lineHeight: "1",
  outline: "none",
  width: "$10",
  padding: "$5",
  textAlign: "inherit",
  verticalAlign: "middle",
  WebkitTapHighlightColor: "rgba(0, 0, 0, 0)",

  backgroundColor: "$panel",
  display: "block",
  textDecoration: "none",
  color: "inherit",
  flexShrink: 0,
  borderRadius: "$3",
  position: "relative",

  "&::before": {
    boxSizing: "border-box",
    content: '""',
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    boxShadow: "inset 0 0 0 1px rgba(0,0,0,.1)",
    borderRadius: "$3",
    pointerEvents: "none",
  },

  variants: {
    variant: {
      interactive: {
        "@hover": {
          "&:hover": {
            "&::before": {
              boxShadow: "inset 0 0 0 1px rgba(0,0,0,.2)",
            },
          },
        },
        "&:focus": {
          "&::before": {
            boxShadow: "inset 0 0 0 1px $colors$blue8, 0 0 0 1px $colors$blue8",
          },
        },
      },
      ghost: {
        backgroundColor: "transparent",
        transition:
          "transform 200ms cubic-bezier(0.22, 1, 0.36, 1), background-color 25ms linear",
        willChange: "transform",
        "&::before": {
          boxShadow:
            "0px 10px 38px -10px rgba(22, 23, 24, 0.35), 0px 10px 20px -15px rgba(22, 23, 24, 0.2)",
          opacity: "0",
          transition: "all 200ms cubic-bezier(0.22, 1, 0.36, 1)",
        },
        "@hover": {
          "&:hover": {
            backgroundColor: "$panel",
            transform: "translateY(-2px)",
            "&::before": {
              opacity: "1",
            },
          },
        },
        "&:active": {
          transform: "translateY(0)",
          transition: "none",
          "&::before": {
            boxShadow:
              "0px 5px 16px -5px rgba(22, 23, 24, 0.35), 0px 5px 10px -7px rgba(22, 23, 24, 0.2)",
            opacity: "1",
          },
        },
        "&:focus": {
          boxShadow: "inset 0 0 0 1px $colors$blue8, 0 0 0 1px $colors$blue8",
        },
      },
      active: {
        transform: "translateY(0)",
        transition: "none",
        "&::before": {
          boxShadow:
            "0px 5px 16px -5px rgba(22, 23, 24, 0.35), 0px 5px 10px -7px rgba(22, 23, 24, 0.2)",
          opacity: "1",
        },
        "&:focus": {
          boxShadow: "inset 0 0 0 1px $colors$blue8, 0 0 0 1px $colors$blue8",
        },
      },
    },
  },
});
