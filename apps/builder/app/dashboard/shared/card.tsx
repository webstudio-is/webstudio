import {
  Flex,
  theme,
  Box,
  Grid,
  styled,
  css,
  Slot,
  type SlotProps,
} from "@webstudio-is/design-system";
import { forwardRef, type ComponentProps } from "react";

const cardStyle = css({
  display: "flex",
  padding: 0,
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
    outlineOffset: 1,
  },
});

type CardProps = ComponentProps<"div"> & {
  asChild?: boolean;
} & SlotProps;

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ asChild, ...props }, ref) => {
    const Component = asChild ? Slot : Box;
    return <Component {...props} className={cardStyle()} ref={ref} />;
  }
);
Card.displayName = "Card";

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
