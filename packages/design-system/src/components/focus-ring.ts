import { cssVar } from "../css-var";
import { theme, type CSS } from "../stitches.config";

export const focusRingStyle = (props?: CSS) => ({
  "&::after": {
    content: '""',
    position: "absolute",
    inset: theme.spacing[3],
    outlineWidth: 1,
    outlineStyle: "solid",
    outlineColor: cssVar("--border-focus"),
    borderRadius: theme.borderRadius[3],
    pointerEvents: "none",
    ...props,
  },
});
