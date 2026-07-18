import { Flex, Text, theme } from "@webstudio-is/design-system";
import { UploadIcon } from "@webstudio-is/icons";

export const AssetPanelState = ({
  message,
  description,
  active = false,
  overlay = false,
}: {
  message: string;
  description?: string;
  active?: boolean;
  overlay?: boolean;
}) => (
  <Flex
    data-asset-panel-state-overlay={overlay ? "" : undefined}
    align="center"
    justify="center"
    direction="column"
    css={{
      flex: 1,
      minHeight: 0,
      ...(overlay
        ? { position: "absolute", inset: 0, pointerEvents: "none" }
        : {}),
      margin: theme.spacing[4],
      color: active
        ? theme.colors.foregroundMain
        : theme.colors.foregroundSubtle,
      border: `1px dashed ${active ? theme.colors.foregroundMain : "transparent"}`,
    }}
  >
    <Flex align="center" gap={1} shrink={false}>
      <UploadIcon />
      <Text variant="regularBold">{message}</Text>
    </Flex>
    {description !== undefined && (
      <Text
        color="subtle"
        align="center"
        css={{ maxWidth: theme.spacing[28], marginTop: theme.spacing[2] }}
      >
        {description}
      </Text>
    )}
  </Flex>
);
