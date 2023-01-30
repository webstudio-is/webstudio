import { css, theme } from "../../stitches.config";

export const floatingPanelStyles = css({
  border: `1px solid ${theme.colors.borderMain}`,
  boxShadow: theme.shadows.menuDropShadow,
  background: theme.colors.backgroundPanel,
  borderRadius: theme.borderRadius[4],
  display: "flex",
  flexDirection: "column",

  "&:focus": {
    // override browser default
    outline: "none",
  },
});
