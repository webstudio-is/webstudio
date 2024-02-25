import { theme, type CSS } from "../stitches.config";

export const focusRingStyle = (style?: CSS) => ({
  "&::after": {
    content: '""',
    position: "absolute",
    left: theme.spacing[3],
    right: theme.spacing[3],
    top: theme.spacing[2],
    bottom: theme.spacing[2],
    outlineWidth: 2,
    outlineStyle: "solid",
    outlineColor: theme.colors.borderFocus,
    borderRadius: theme.borderRadius[3],
    pointerEvents: "none",
    ...style,
  },
});
