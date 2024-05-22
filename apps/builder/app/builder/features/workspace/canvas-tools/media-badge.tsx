import { useStore } from "@nanostores/react";
import { Flex, Text, css, theme } from "@webstudio-is/design-system";
import { $selectedBreakpoint } from "~/shared/nano-states";

const labelStyle = css({
  position: "absolute",
  top: "50%",
  left: `calc(-${theme.spacing[23]})`,
  transform: "rotate(-90deg)",
});

const badgeStyle = css({
  background: theme.colors.backgroundTopbarHover,
  px: theme.spacing[3],
  py: theme.spacing[2],
  borderRadius: theme.borderRadius[3],
});

export const MediaBadge = () => {
  const breakpoint = useStore($selectedBreakpoint);
  if (breakpoint === undefined) {
    return null;
  }
  const media =
    breakpoint.maxWidth !== undefined
      ? `@media (max-width: ${breakpoint.maxWidth}px)`
      : breakpoint.minWidth !== undefined
        ? `@media (min-width: ${breakpoint.minWidth}px)`
        : undefined;
  if (media === undefined) {
    return null;
  }
  return (
    <Flex gap="2" className={labelStyle()} align="center">
      <Text variant="labelsTitleCase" color="contrast" className={badgeStyle()}>
        {breakpoint.maxWidth ?? breakpoint.minWidth}
      </Text>
      <Text variant="labelsSentenceCase">{media}</Text>
    </Flex>
  );
};
