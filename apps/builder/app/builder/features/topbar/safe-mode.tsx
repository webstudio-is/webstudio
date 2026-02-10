import { ShieldIcon } from "@webstudio-is/icons";
import {
  Tooltip,
  ToolbarToggleItem,
  Button,
  Text,
  Flex,
  rawTheme,
} from "@webstudio-is/design-system";
import { builderApi } from "~/shared/builder-api";

export const SafeModeButton = () => {
  if (!builderApi.isSafeMode()) {
    return;
  }

  const handleExitSafeMode = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("safemode");
    window.location.href = url.href;
  };

  return (
    <Tooltip
      variant="wrapped"
      content={
        <Flex direction="column" gap="2">
          <Text variant="regularBold">Safe mode active</Text>
          <Text>
            Safe mode prevents all external JavaScript from executing. HTML
            embeds will not run scripts even if "Run scripts on canvas" is
            enabled.
          </Text>
          <Button color="destructive" onClick={handleExitSafeMode}>
            Exit safe mode
          </Button>
        </Flex>
      }
    >
      <ToolbarToggleItem value="safe-mode" variant="subtle" tabIndex={0}>
        <ShieldIcon stroke={rawTheme.colors.foregroundDestructive} />
      </ToolbarToggleItem>
    </Tooltip>
  );
};
