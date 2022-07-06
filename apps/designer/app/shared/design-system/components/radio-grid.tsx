import { styled } from "../stitches.config";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";

export const RadioGridGroup = styled(RadioGroupPrimitive.Root, {
  display: "grid",
  gap: "$1",
  gridTemplateColumns: "repeat(5, 1fr)",
});

export const RadioGrid = styled(RadioGroupPrimitive.Item, {
  all: "unset",
  boxSizing: "border-box",
  userSelect: "none",
  textAlign: "center",
  "&::before": {
    boxSizing: "border-box",
  },
  "&::after": {
    boxSizing: "border-box",
  },
  borderRadius: "$2",
  boxShadow: "inset 0 0 0 1px $colors$slate7",
  px: "$1",
  height: "$6",
  lineHeight: "$sizes$6",
  fontSize: "$3",
  "@hover": {
    "&:hover": {
      boxShadow: "inset 0 0 0 1px $colors$slate8",
    },
  },
  '&[data-state="checked"]': {
    boxShadow: "inset 0 0 0 1px $colors$slate8",
    backgroundColor: "$slate4",
  },
});
