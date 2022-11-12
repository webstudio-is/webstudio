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
  whiteSpace: "nowrap",
  fontSize: "$fontSize$4",
  lineHeight: 1,
  alignItems: "center",
  justifyContent: "center",
  marginLeft: 1,
  "&": {
    px: "$spacing$5",
    py: "$spacing$3",
  },
  "&:first-child": {
    marginLeft: 0,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  "&:last-child": { borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  "&:hover": { backgroundColor: "$slateA3" },
  "&[data-state=on]": {
    backgroundColor: "$slate5",
    "&[data-breakpoint=true]": {
      color: "$colors$blue11",
      backgroundColor: "$colors$blue4",
    },
  },
});
