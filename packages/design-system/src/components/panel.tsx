import { css, styled } from "../stitches.config";
import { theme } from "../stitches.config";

export const panelStyles = css({
  overflow: "auto",
  backgroundColor: theme.colors.slate4,
  borderRadius: theme.borderRadius[4],
  boxShadow: `0px 2px 7px rgba(0, 0, 0, 0.1), 0px 5px 17px rgba(0, 0, 0, 0.15), inset 0 0 1px 1px ${theme.colors.slate1}, 0 0 0 1px ${theme.colors.slate7}`,
});

export const Panel = styled("div", panelStyles);
