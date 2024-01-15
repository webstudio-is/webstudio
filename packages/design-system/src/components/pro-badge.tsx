import { theme } from "../stitches.config";
import { Text } from "./text";

export const ProBadge = () => {
  return (
    <Text
      css={{
        display: "inline-flex",
        borderRadius: theme.borderRadius[2],
        px: theme.spacing[3],
        py: theme.spacing[1],
        height: theme.spacing[9],
        color: theme.colors.foregroundContrastMain,
        alignItems: "center",
        maxWidth: "100%",
        whiteSpace: "nowrap",
        overflow: "hidden",
        // @todo doesn't work in tooltips, needs a workaround
        textOverflow: "ellipsis",
        background: theme.colors.backgroundStyleSourceNeutral,
      }}
    >
      Pro
    </Text>
  );
};
