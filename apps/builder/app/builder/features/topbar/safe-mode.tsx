import { useState } from "react";
import { ShieldIcon } from "@webstudio-is/icons";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  theme,
  ToolbarButton,
  Button,
  Text,
  Flex,
  rawTheme,
} from "@webstudio-is/design-system";
import { builderApi } from "~/shared/builder-api";

export const SafeModeButton = () => {
  const [open, setOpen] = useState(false);

  if (!builderApi.isSafeMode()) {
    return;
  }

  const handleExitSafeMode = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("safemode");
    window.location.href = url.href;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ToolbarButton variant="subtle" tabIndex={0}>
          <ShieldIcon stroke={rawTheme.colors.foregroundDestructive} />
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent>
        <Flex
          direction="column"
          gap="2"
          css={{
            padding: theme.panel.padding,
            width: theme.spacing[30],
          }}
        >
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
      </PopoverContent>
    </Popover>
  );
};
