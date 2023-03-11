import { styled } from "../stitches.config";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { theme } from "../stitches.config";

export const ToggleGroup = styled(ToggleGroupPrimitive.Root, {
  display: "inline-flex",
  borderRadius: theme.spacing[3],
  boxShadow: `0 0 0 ${theme.spacing[1]} ${theme.colors.slate7}`,
  padding: 2,
});

export const ToggleGroupItem = styled(ToggleGroupPrimitive.Item, {
  // all: "unset", // @note weird bug, this somehow gets into weird specifity issues with how styles are inserted
  border: "none",
  backgroundColor: theme.colors.loContrast,
  color: theme.colors.hiContrast,
  display: "flex",
  whiteSpace: "nowrap",
  fontSize: theme.deprecatedFontSize[4],
  lineHeight: 1,
  alignItems: "center",
  justifyContent: "center",
  marginLeft: 1,
  height: theme.spacing[11],
  outline: "none",
  "&": {
    px: theme.spacing[3],
  },
  "&:first-child": {
    marginLeft: 0,
    borderTopLeftRadius: theme.spacing[3],
    borderBottomLeftRadius: theme.spacing[3],
  },
  "&:last-child": {
    borderTopRightRadius: theme.spacing[3],
    borderBottomRightRadius: theme.spacing[3],
  },
  "&:hover": { backgroundColor: theme.colors.slateA3 },
  // @note because the outline is outside of the element others can end up covering it
  "&:focus-visible": {
    outline: `2px solid ${theme.colors.borderFocus}`,
    outlineOffset: "-2px",
    borderRadius: theme.spacing[3],

    zIndex: 1,
  },
  "&[data-state=on]": { backgroundColor: theme.colors.slate5 },
});
