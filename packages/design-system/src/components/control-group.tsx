import { styled } from "../stitches.config";
import { Button } from "./button";
import { TextField } from "./text-field";
import { Select } from "./select";

export const ControlGroup = styled("div", {
  display: "flex",

  // Make sure ControlGroup and its children don't affect normal stacking order
  position: "relative",
  zIndex: 0,

  [`& ${Button}`]: {
    borderRadius: 0,
    boxShadow:
      "inset 0 1px $colors$muted, inset -1px 0 $colors$muted, inset 0 -1px $colors$muted",
    "&:hover": {
      boxShadow:
        "-1px 0 $colors$slate8, inset 0 1px $colors$slate8, inset -1px 0 $colors$slate8, inset 0 -1px $colors$slate8",
    },
    "&:focus": {
      zIndex: 1,
      boxShadow: "inset 0 0 0 1px $colors$slate8, 0 0 0 1px $colors$slate8",
    },
    "&:first-child": {
      borderTopLeftRadius: "$1",
      borderBottomLeftRadius: "$1",
      boxShadow: "inset 0 0 0 1px $colors$muted",
      "&:hover": {
        boxShadow: "inset 0 0 0 1px $colors$slate8",
      },
      "&:focus": {
        boxShadow: "inset 0 0 0 1px $colors$slate8, 0 0 0 1px $colors$slate8",
      },
    },
    "&:last-child": {
      borderTopRightRadius: "$1",
      borderBottomRightRadius: "$1",
      boxShadow:
        "inset 0 1px $colors$muted, inset -1px 0 $colors$muted, inset 0 -1px $colors$muted",
      "&:focus": {
        boxShadow: "inset 0 0 0 1px $colors$slate8, 0 0 0 1px $colors$slate8",
      },
    },
  },
  [`& ${TextField}`]: {
    borderRadius: 0,
    boxShadow:
      "inset 0 1px $colors$muted, inset -1px 0 $colors$muted, inset 0 -1px $colors$muted",
    "&:focus": {
      zIndex: 1,
      boxShadow:
        "inset 0px 0px 0px 1px $colors$blue8, 0px 0px 0px 1px $colors$blue8",
    },
    "&:first-child": {
      borderTopLeftRadius: "$1",
      borderBottomLeftRadius: "$1",
      boxShadow: "inset 0 0 0 1px $colors$muted",
      "&:focus": {
        boxShadow:
          "inset 0px 0px 0px 1px $colors$blue8, 0px 0px 0px 1px $colors$blue8",
      },
    },
    "&:last-child": {
      borderTopRightRadius: "$1",
      borderBottomRightRadius: "$1",
      boxShadow:
        "inset 0 1px $colors$muted, inset -1px 0 $colors$muted, inset 0 -1px $colors$muted",
      "&:focus": {
        boxShadow:
          "inset 0px 0px 0px 1px $colors$blue8, 0px 0px 0px 1px $colors$blue8",
      },
    },
  },
  [`& ${Select}`]: {
    borderRadius: 0,
    boxShadow:
      "inset 0 1px $colors$muted, inset -1px 0 $colors$muted, inset 0 -1px $colors$muted",
    "&:focus-within": {
      boxShadow:
        "inset 0px 0px 0px 1px $colors$blue8, 0px 0px 0px 1px $colors$blue8",
    },
    "&:first-child": {
      borderTopLeftRadius: "$1",
      borderBottomLeftRadius: "$1",
      boxShadow: "inset 0 0 0 1px $colors$muted",
      "&:focus-within": {
        boxShadow:
          "inset 0px 0px 0px 1px $colors$blue8, 0px 0px 0px 1px $colors$blue8",
      },
    },
    "&:last-child": {
      borderTopRightRadius: "$1",
      borderBottomRightRadius: "$1",
      boxShadow:
        "inset 0 1px $colors$muted, inset -1px 0 $colors$muted, inset 0 -1px $colors$muted",
      "&:focus-within": {
        boxShadow:
          "inset 0px 0px 0px 1px $colors$blue8, 0px 0px 0px 1px $colors$blue8",
      },
    },
  },
});
