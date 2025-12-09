import { useStore } from "@nanostores/react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogClose,
  Grid,
  Text,
  Kbd,
  ScrollArea,
  theme,
  Box,
} from "@webstudio-is/design-system";
import { atom } from "nanostores";
import { $commandMetas } from "~/shared/commands-emitter";

const $isKeyboardShortcutsOpen = atom(false);

export const openKeyboardShortcutsDialog = () => {
  $isKeyboardShortcutsOpen.set(true);
};

const isMac =
  typeof navigator === "object" ? /mac/i.test(navigator.platform) : false;

// Filter hotkeys to show only the appropriate one for current OS
const filterHotkeyForOS = (hotkeys: string[]): string => {
  // If there's only one hotkey, return it
  if (hotkeys.length === 1) {
    return hotkeys[0];
  }

  // Find Mac hotkey (starts with meta) or Windows hotkey (starts with ctrl)
  const macHotkey = hotkeys.find((key) => key.includes("meta"));
  const winHotkey = hotkeys.find((key) => key.includes("ctrl"));

  if (isMac && macHotkey) {
    return macHotkey;
  }
  if (!isMac && winHotkey) {
    return winHotkey;
  }

  // Fallback to first hotkey
  return hotkeys[0];
};

// Additional shortcuts not in commands system but should be shown
const additionalShortcuts = [
  {
    name: "copy",
    label: "Copy",
    category: "Copy/Paste",
    defaultHotkeys: ["meta+c", "ctrl+c"],
  },
  {
    name: "cut",
    label: "Cut",
    category: "Copy/Paste",
    defaultHotkeys: ["meta+x", "ctrl+x"],
  },
  {
    name: "paste",
    label: "Paste",
    category: "Copy/Paste",
    defaultHotkeys: ["meta+v", "ctrl+v"],
  },
];

export const KeyboardShortcutsDialog = () => {
  const isOpen = useStore($isKeyboardShortcutsOpen);
  const commandMetas = useStore($commandMetas);

  // Filter commands that have hotkeys and are not hidden
  const commandsWithHotkeys = Array.from(commandMetas.values()).filter(
    (command) =>
      command.defaultHotkeys &&
      command.defaultHotkeys.length > 0 &&
      !command.hidden
  );

  // Combine with additional shortcuts
  const allShortcuts = [...commandsWithHotkeys, ...additionalShortcuts];

  // Group filtered commands by category
  const groupedCommands = allShortcuts.reduce<
    Record<string, Array<(typeof allShortcuts)[number]>>
  >((acc, command) => {
    const category = command.category ?? "Other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(command);
    return acc;
  }, {});

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => $isKeyboardShortcutsOpen.set(open)}
    >
      <DialogContent
        css={{
          width: "min(90vw, 800px)",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <DialogTitle>Keyboard Shortcuts</DialogTitle>
        <ScrollArea
          css={{
            flexGrow: 1,
            px: theme.spacing[9],
            mx: `calc(${theme.spacing[9]} * -1)`,
          }}
        >
          <Grid
            gap={9}
            css={{
              gridTemplateColumns: "1fr 1fr",
              "@media (max-width: 768px)": {
                gridTemplateColumns: "1fr",
              },
            }}
          >
            {Object.entries(groupedCommands).map(
              ([category, categoryCommands]) => (
                <Box key={category} css={{ mb: theme.spacing[5] }}>
                  <Text
                    css={{
                      mb: theme.spacing[3],
                      color: theme.colors.foregroundMain,
                      fontWeight: 600,
                      fontSize: theme.deprecatedFontSize[3],
                    }}
                  >
                    {category}
                  </Text>
                  <Grid
                    gap={1}
                    css={{
                      gridTemplateColumns: "auto 1fr",
                      alignItems: "center",
                      rowGap: theme.spacing[3],
                    }}
                  >
                    {categoryCommands.map((command) => {
                      const hotkey = command.defaultHotkeys
                        ? filterHotkeyForOS(command.defaultHotkeys)
                        : "";

                      return (
                        <>
                          <Box
                            key={`${command.name}-kbd`}
                            css={{
                              display: "flex",
                              gap: theme.spacing[1],
                              justifyContent: "flex-start",
                            }}
                          >
                            <Kbd
                              value={hotkey.split("+") as string[]}
                              color="moreSubtle"
                            />
                          </Box>
                          <Text
                            key={`${command.name}-label`}
                            css={{
                              color: theme.colors.foregroundSubtle,
                              fontSize: theme.deprecatedFontSize[2],
                            }}
                          >
                            {command.label ?? command.name}
                          </Text>
                        </>
                      );
                    })}
                  </Grid>
                </Box>
              )
            )}
          </Grid>
        </ScrollArea>
        <DialogClose />
      </DialogContent>
    </Dialog>
  );
};
