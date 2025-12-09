import { useStore } from "@nanostores/react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Grid,
  Text,
  Kbd,
  filterHotkeyByOs,
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

// Additional shortcuts not in commands system but should be shown
const additionalShortcuts = [
  {
    name: "copy",
    label: "Copy",
    description: "Copy selected instance",
    category: "Copy/Paste",
    defaultHotkeys: ["meta+c", "ctrl+c"],
  },
  {
    name: "cut",
    label: "Cut",
    description: "Cut selected instance",
    category: "Copy/Paste",
    defaultHotkeys: ["meta+x", "ctrl+x"],
  },
  {
    name: "paste",
    label: "Paste",
    description: "Paste copied instance",
    category: "Copy/Paste",
    defaultHotkeys: ["meta+v", "ctrl+v"],
  },
  {
    name: "editComponent",
    label: "Edit Component",
    description: "Edit component",
    category: "Left-hand toolbar",
    defaultHotkeys: ["enter"],
  },
  {
    name: "expandNavigatorItem",
    label: "Expand Navigator item",
    description: "Expand navigator item",
    category: "Left-hand toolbar",
    defaultHotkeys: ["arrowright"],
  },
  {
    name: "collapseNavigatorItem",
    label: "Collapse Navigator item",
    description: "Collapse navigator item",
    category: "Left-hand toolbar",
    defaultHotkeys: ["arrowleft"],
  },
  {
    name: "switchBreakpoint",
    label: "Switch breakpoints",
    description: "Switch to breakpoint by number (1-9)",
    category: "Device views",
    defaultHotkeys: ["1-9"],
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

  // Define popularity order for shortcuts within each category
  const shortcutOrder: Record<string, string[]> = {
    General: [
      "save",
      "cancelCurrentDrag",
      "openCommandPanel",
      "openPublishDialog",
      "openExportDialog",
      "openKeyboardShortcuts",
    ],
    "Main navigation": [
      "toggleDesignMode",
      "togglePreviewMode",
      "toggleContentMode",
    ],
    Components: [
      "toggleComponentsPanel",
      "duplicateInstance",
      "deleteInstanceBuilder",
      "editInstanceLabel",
    ],
    "Copy/Paste": ["copy", "cut", "paste", "duplicateInstance"],
    "Undo/redo": ["undo", "redo"],
    View: ["toggleContentMode"],
    "Left-hand toolbar": [
      "toggleNavigatorPanel",
      "editComponent",
      "expandNavigatorItem",
      "collapseNavigatorItem",
    ],
    "Right-hand tabs": [
      "openStylePanel",
      "focusStyleSources",
      "openSettingsPanel",
      "toggleStylePanelFocusMode",
      "toggleStylePanelAdvancedMode",
    ],
    "Device views": ["switchBreakpoint"],
  };

  // Sort shortcuts within each category by popularity
  Object.keys(groupedCommands).forEach((category) => {
    const order = shortcutOrder[category] || [];
    groupedCommands[category].sort((a, b) => {
      const aIndex = order.indexOf(a.name);
      const bIndex = order.indexOf(b.name);
      // If both are in the order list, sort by their position
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      // If only one is in the order list, prioritize it
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      // If neither is in the order list, maintain original order
      return 0;
    });
  });

  // Define category order by popularity
  const categoryOrder = [
    "General",
    "Main navigation",
    "Copy/Paste",
    "Undo/redo",
    "Components",
    "Left-hand toolbar",
    "Right-hand tabs",
    "View",
    "Device views",
    "Other",
  ];

  // Sort categories by popularity
  const sortedCategories = Object.keys(groupedCommands).sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a);
    const bIndex = categoryOrder.indexOf(b);
    // If both are in the order list, sort by their position
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    // If only one is in the order list, prioritize it
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    // If neither is in the order list, maintain original order
    return 0;
  });

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => $isKeyboardShortcutsOpen.set(open)}
    >
      <DialogContent
        css={{
          width: 700,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <DialogTitle>Keyboard shortcuts</DialogTitle>
        <ScrollArea>
          <Grid columns={2} gap={3} css={{ padding: theme.panel.padding }}>
            {sortedCategories.map((category) => {
              const categoryCommands = groupedCommands[category];
              return (
                <Box key={category}>
                  <Text
                    variant="titles"
                    color="main"
                    css={{ mb: theme.spacing[5] }}
                  >
                    {category}
                  </Text>
                  <Grid
                    gap={2}
                    align="center"
                    css={{ gridTemplateColumns: "100px 1fr" }}
                  >
                    {categoryCommands.map((command) => {
                      const hotkey = command.defaultHotkeys
                        ? filterHotkeyByOs(command.defaultHotkeys)
                        : undefined;

                      if (!hotkey) {
                        return;
                      }

                      return (
                        <>
                          <Kbd
                            key={`${command.name}-kbd`}
                            value={hotkey.split("+") as string[]}
                            color="moreSubtle"
                          />
                          <Text
                            key={`${command.name}-text`}
                            variant="regular"
                            color="subtle"
                          >
                            {("description" in command &&
                              command.description) ||
                              command.label ||
                              command.name}
                          </Text>
                        </>
                      );
                    })}
                  </Grid>
                </Box>
              );
            })}
          </Grid>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
