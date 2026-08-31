import { Grid, cssVar, styled, theme } from "@webstudio-is/design-system";

export const ProjectSettingsDataRow = styled(Grid, {
  p: theme.spacing[3],
  overflow: "hidden",
  position: "relative",
  "& > button": {
    opacity: 0,
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    height: "auto",
    borderRadius: 0,
    background: cssVar("--background-primary"),
  },
  "&:hover > button, &:focus-within > button": {
    opacity: 1,
  },
});
