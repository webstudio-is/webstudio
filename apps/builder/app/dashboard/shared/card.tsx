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

const borderColorVar = "--ws-dashboard-card-border-color";

const cardStyle = css({
  position: "relative",
  display: "flex",
  padding: 0,
  height: "100%",
  flexDirection: "column",
  alignItems: "center",
  flexShrink: 0,
  aspectRatio: "8 / 7",
  outline: "none",
  "&:hover, &:focus-within, &:focus-visible": {
    [borderColorVar]: theme.colors.borderFocus,
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
  width: "100%",
  height: "100%",
  outline: `1px solid var(${borderColorVar}, transparent)`,
  borderRadius: theme.borderRadius[5],
});

export const CardFooter = styled(Flex, {
  justifyContent: "space-between",
  flexShrink: 0,
  alignSelf: "stretch",
  flexGap: theme.spacing[3],
  background: theme.colors.brandBackgroundProjectCardTextArea,
  height: theme.spacing[17],
  paddingBlock: theme.panel.paddingBlock,
});
