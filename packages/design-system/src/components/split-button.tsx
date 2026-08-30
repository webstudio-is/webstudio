import { styled, theme } from "../stitches.config";
import { cssVar } from "../css-var";
import { IconButton } from "./icon-button";

export const SplitButton = styled("div", {
  display: "inline-flex",
  alignItems: "center",
  gap: theme.spacing[1],
  "&:hover:not(:has(> button:disabled:hover, > button[aria-disabled=true]:hover))":
    {
      "> button:not(:disabled):not([aria-disabled=true])": {
        background: cssVar("--overlay-interaction-hover"),
      },
    },
});

export const SplitButtonMenuButton = styled(IconButton, {
  minWidth: "auto",
  width: "auto",
  paddingInline: 0,
});
