import { Flex, theme, Box, Grid, styled } from "@webstudio-is/design-system";

export const Card = styled(Box, {
  display: "flex",
  height: "100%",
  flexDirection: "column",
  alignItems: "center",
  flexShrink: 0,
  overflow: "hidden",
  aspectRatio: "8 / 7",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: theme.colors.borderMain,
  borderRadius: theme.borderRadius[4],
  background: theme.colors.brandBackgroundProjectCardFront,
  "&:hover, &:focus-within": {
    boxShadow: theme.shadows.brandElevationBig,
  },
  "&:focus-visible": {
    outline: `2px solid ${theme.colors.borderFocus}`,
  },
});

export const CardContent = styled(Grid, {
  position: "relative",
  overflow: "hidden",
  minWidth: "100%",
  height: "100%",
});

export const CardFooter = styled(Flex, {
  justifyContent: "space-between",
  flexShrink: 0,
  alignSelf: "stretch",
  flexGap: theme.spacing[3],
  background: theme.colors.brandBackgroundProjectCardTextArea,
  height: theme.spacing[17],
  py: theme.spacing[5],
  px: theme.spacing[7],
});
