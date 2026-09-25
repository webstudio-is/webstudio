import { Grid, cssVar, styled, theme } from "@webstudio-is/design-system";

export const ProjectSettingsDataRow = styled(Grid, {
  p: theme.spacing[3],
  overflow: "hidden",
  position: "relative",
  "& > button, & > [role='cell'] > button": {
    opacity: 0,
    position: "absolute",
    right: theme.spacing[2],
    top: "50%",
    transform: "translateY(-50%)",
    background: cssVar("--background-primary"),
  },
  "&:hover, &:focus-within": {
    "& > button, & > [role='cell'] > button": {
      opacity: 1,
    },
  },
});
