import { styled, theme } from "../stitches.config";
import { cssVar } from "../css-var";
import { IconButton } from "./icon-button";

export const SplitButton = styled("div", {
  display: "inline-flex",
  alignItems: "center",
  gap: theme.spacing[1],
  "> button:first-of-type": {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  "> button:last-of-type": {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  "&:hover:not(:has(> button:disabled:hover, > button[aria-disabled=true]:hover))":
    {
      "> button:first-of-type:not(:disabled):not([aria-disabled=true])": {
        background: cssVar("--overlay-interaction-hover"),
      },
      "> button:last-of-type:not(:disabled):not([aria-disabled=true])::before":
        {
          background: cssVar("--overlay-interaction-hover"),
        },
    },
});

export const SplitButtonMenuButton = styled(IconButton, {
  position: "relative",
  minWidth: theme.sizes.controlHeight,
  width: theme.sizes.controlHeight,
  marginInline: `-${theme.spacing[3]}`,
  paddingInline: 0,
  border: 0,
  background: "transparent !important",
  "> svg": {
    flexShrink: 0,
    position: "relative",
    zIndex: 1,
  },
  "&::before": {
    content: '""',
    position: "absolute",
    insetBlock: 0,
    insetInline: theme.spacing[3],
    backgroundColor: "transparent",
    borderTopRightRadius: theme.borderRadius[3],
    borderBottomRightRadius: theme.borderRadius[3],
  },
  "&:hover::before, &[data-hovered=true]::before, &[data-state=open]::before": {
    background: cssVar("--overlay-interaction-hover"),
  },
  "&:active::before": {
    background: cssVar("--overlay-interaction-pressed"),
  },
  "&[data-focused=true], &:focus-visible": {
    outline: `1px solid ${cssVar("--border-focus")}`,
    outlineOffset: "-1px",
  },
  "&:disabled::before, &[aria-disabled=true]::before": {
    background: "transparent",
  },
});
