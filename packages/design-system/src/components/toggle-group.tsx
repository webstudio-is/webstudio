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
  "&[data-state=on]": { backgroundColor: "$slate5" },
  // whiteSpace: "nowrap",
  // fontSize: 15,
  // lineHeight: 1,
  // marginLeft: 1,
  // "&": {
  //   px: "$2",
  //   py: "$1",
  // },
  // "&:first-child": {
  //   marginLeft: 0,
  //   borderTopLeftRadius: 4,
  //   borderBottomLeftRadius: 4,
  // },
  // "&:last-child": { borderTopRightRadius: 4, borderBottomRightRadius: 4 },
});
