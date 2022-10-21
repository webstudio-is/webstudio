import { styled } from "../stitches.config";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";

export const Root = styled(ToggleGroupPrimitive.Root, {
  display: "inline-flex",
  backgroundColor: "$muted",
  borderRadius: 4,
  boxShadow: `0 2px 10px $blackA7`,
});

export const Item = styled(ToggleGroupPrimitive.Item, {
  all: "unset",
  backgroundColor: "$panel",
  color: "$hiContrast",
  display: "flex",
  whiteSpace: "nowrap",
  fontSize: 15,
  lineHeight: 1,
  alignItems: "center",
  justifyContent: "center",
  marginLeft: 1,
  "&": {
    px: "$2",
    py: "$1",
  },
  "&:first-child": {
    marginLeft: 0,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  "&:last-child": { borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  "&:hover": { backgroundColor: "$slateA3" },
  "&[data-state=on]": {
    backgroundColor: "$slateA5",
  },
  "&:focus": {
    position: "relative",
    boxShadow: `0 0 0 2px black`,
  },
});
