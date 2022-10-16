import { styled } from "../stitches.config";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";

export const Root = styled(ToggleGroupPrimitive.Root, {
  display: "inline-flex",
  borderRadius: "$1",
  boxShadow: `0 0 0 1px $colors$slate7`,
  padding: 2,
});

export const Item = styled(ToggleGroupPrimitive.Item, {
  all: "unset",
  backgroundColor: "$loContrast",
  color: "$hiContrast",
  display: "flex",
  width: "$5",
  height: "$5",
  borderRadius: 2,
  alignItems: "center",
  justifyContent: "center",
  "&:hover": { backgroundColor: "$slate5" },
  "&:focus": { boxShadow: "0 0 0 2px $colors$blue10", zIndex: 1 },
  "&[data-state=on]": {
    backgroundColor: "$slate5",
    "&[data-breakpoint=true]": {
      color: "$colors$blue11",
      backgroundColor: "$colors$blue4",
    },
  },
});
