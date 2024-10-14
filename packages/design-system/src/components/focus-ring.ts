import { theme } from "../stitches.config";

export const focusRingStyle = ({
  outlineWidth = 1,
}: {
  outlineWidth: number;
}) => ({
  "&::after": {
    content: '""',
    position: "absolute",
    inset: theme.spacing[3],
    outlineWidth,
    outlineStyle: "solid",
    outlineColor: theme.colors.borderFocus,
    borderRadius: theme.borderRadius[3],
    pointerEvents: "none",
  },
});
