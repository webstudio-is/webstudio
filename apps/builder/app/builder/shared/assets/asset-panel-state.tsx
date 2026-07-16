import { Flex, Text, theme } from "@webstudio-is/design-system";
import { UploadIcon } from "@webstudio-is/icons";

export const AssetPanelState = ({
  message,
  description,
  active = false,
}: {
  message: string;
  description?: string;
  active?: boolean;
}) => (
  <Flex
    align="center"
    direction="column"
    css={{
      flex: 1,
      minHeight: 0,
      margin: theme.spacing[4],
      color: active
        ? theme.colors.foregroundMain
        : theme.colors.foregroundSubtle,
      border: `1px dashed ${active ? theme.colors.foregroundMain : "transparent"}`,
      paddingTop: "35%",
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
