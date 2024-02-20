import { theme, type CSS } from "../stitches.config";

export const focusRingStyle = (style?: CSS) => ({
  "&::after": {
    content: '""',
    position: "absolute",
    inset: 4,
    outlineWidth: 2,
    outlineStyle: "solid",
    outlineColor: theme.colors.borderFocus,
    borderRadius: theme.borderRadius[3],
    ...style,
  },
});
