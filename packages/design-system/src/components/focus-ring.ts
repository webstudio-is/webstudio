import { theme, type CSS } from "../stitches.config";

export const focusRingStyle = (props?: CSS) => ({
  "&::after": {
    content: '""',
    position: "absolute",
    inset: theme.spacing[3],
    outlineWidth: 1,
    outlineStyle: "solid",
    outlineColor: theme.colors.borderFocus,
    borderRadius: theme.borderRadius[3],
    pointerEvents: "none",
    ...props,
  },
});
