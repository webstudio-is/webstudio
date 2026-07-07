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
import { Fragment } from "react";
import { $commandMetas } from "~/shared/commands-emitter";

const $isKeyboardShortcutsOpen = atom(false);

export const openKeyboardShortcutsDialog = () => {
  $isKeyboardShortcutsOpen.set(true);
};

// Additional shortcuts not in commands system but should be shown
const additionalShortcuts = [
  {
    name: "expandNavigatorItem",
    label: "Expand Navigator item",
    description: "Expand navigator item",
    category: "Navigator",
    defaultHotkeys: ["→"],
  },
  {
    name: "collapseNavigatorItem",
    label: "Collapse Navigator item",
    description: "Collapse navigator item",
    category: "Navigator",
    defaultHotkeys: ["←"],
  },
  {
    name: "toggleNavigatorSelection",
    label: "Toggle Navigator selection",
    description: "Add or remove an item from Navigator selection",
    category: "Navigator",
    defaultHotkeys: ["meta+click", "ctrl+click"],
  },
  {
    name: "rangeNavigatorSelection",
    label: "Range-select Navigator items",
    description: "Select a range of Navigator items",
    category: "Navigator",
    defaultHotkeys: ["shift+click"],
  },
  {
    name: "extendNavigatorSelectionUp",
    label: "Extend Navigator selection up",
    description: "Extend Navigator selection up",
    category: "Navigator",
    defaultHotkeys: ["shift+arrowup"],
  },
  {
    name: "extendNavigatorSelectionDown",
    label: "Extend Navigator selection down",
    description: "Extend Navigator selection down",
    category: "Navigator",
    defaultHotkeys: ["shift+arrowdown"],
  },
  {
    name: "selectNavigatorSiblings",
    label: "Select Navigator siblings",
    description: "Select sibling Navigator items",
    category: "Navigator",
    defaultHotkeys: ["meta+a", "ctrl+a"],
  },
  {
    name: "expandAllNavigatorNodes",
    label: "Expand all items",
    description: "Click on arrow to expand or collapse all child items",
    category: "Navigator",
    defaultHotkeys: ["alt+click"],
  },
  {
    name: "switchBreakpoint",
    label: "Switch breakpoints",
    description: "Switch to breakpoint by number (1-9)",
    category: "Top bar",
    defaultHotkeys: ["1-9"],
  },
];

const leftCategoryOrder = ["General", "Top bar", "Panels", "Style panel"];
const rightCategoryOrder = ["Navigator"];

const getShortcutCategoryColumns = (categories: string[]) => {
  const orderedCategories = new Set([
    ...leftCategoryOrder,
    ...rightCategoryOrder,
  ]);
  const remainingCategories = categories.filter(
    (category) => orderedCategories.has(category) === false
  );
  return {
    leftCategories: [
      ...leftCategoryOrder.filter((category) => categories.includes(category)),
      ...remainingCategories.filter((_, index) => index % 2 === 0),
    ],
    rightCategories: [
      ...rightCategoryOrder.filter((category) => categories.includes(category)),
      ...remainingCategories.filter((_, index) => index % 2 === 1),
    ],
  };
};

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

  // Extract valid command names as a type
  type ValidCommandName = (typeof allShortcuts)[number]["name"];

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
  const shortcutOrder: Record<string, ValidCommandName[]> = {
    General: [
      "openCommandPanel",
      "undo",
      "redo",
      "save",
      "toggleUiHidden",
      "cancelCurrentDrag",
      "openPublishDialog",
      "openExportDialog",
      "openKeyboardShortcuts",
    ],
    "Top bar": [
      "toggleDesignMode",
      "toggleContentMode",
      "togglePreviewMode",
      "switchBreakpoint",
      "openPublishDialog",
    ],
    Navigator: [
      "expandNavigatorItem",
      "collapseNavigatorItem",
      "expandAllNavigatorNodes",
      "selectNavigatorSiblings",
      "toggleNavigatorSelection",
      "rangeNavigatorSelection",
      "extendNavigatorSelectionUp",
      "extendNavigatorSelectionDown",
      "copy",
      "cut",
      "paste",
      "duplicateInstance",
      "deleteInstanceBuilder",
      "moveInstanceUp",
      "moveInstanceDown",
      "moveInstanceOut",
      "moveInstanceIntoPreviousSibling",
      "editInstanceLabel",
      "toggleShow",
      "wrap",
      "unwrap",
    ],
    Panels: [
      "toggleComponentsPanel",
      "toggleNavigatorPanel",
      "openStylePanel",
      "openSettingsPanel",
    ],

    "Style panel": [
      "focusStyleSources",
      "toggleStylePanelFocusMode",
      "toggleStylePanelAdvancedMode",
    ],
  };

  // Extract valid category names as a type
  type ValidCategory = keyof typeof groupedCommands;

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
      if (aIndex !== -1) {
        return -1;
      }
      if (bIndex !== -1) {
        return 1;
      }
      // If neither is in the order list, maintain original order
      return 0;
    });
  });

  // Define category order by popularity
  const categoryOrder: ValidCategory[] = [
    "General",
    "Top bar",
    "Navigator",
    "Panels",
    "Style panel",
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
    if (aIndex !== -1) {
      return -1;
    }
    if (bIndex !== -1) {
      return 1;
    }
    // If neither is in the order list, maintain original order
    return 0;
  });

  const { leftCategories, rightCategories } =
    getShortcutCategoryColumns(sortedCategories);

  const renderCategory = (category: ValidCategory) => {
    const categoryCommands = groupedCommands[category];
    return (
      <Box key={category}>
        <Text variant="titles" color="main" css={{ mb: theme.spacing[5] }}>
          {category}
        </Text>
        <Grid gap={3} align="center" css={{ gridTemplateColumns: "10ch 1fr" }}>
          {categoryCommands.map((command) => {
            const hotkey = command.defaultHotkeys
              ? filterHotkeyByOs(command.defaultHotkeys)
              : undefined;

            if (!hotkey) {
              return;
            }

            return (
              <Fragment key={command.name}>
                <Box css={{ textAlign: "right" }}>
                  <Box
                    as="span"
                    css={{
                      paddingInline: 4,
                      border: `1px solid ${theme.colors.borderNeutral}`,
                      borderRadius: theme.borderRadius[2],
                    }}
                  >
                    <Kbd
                      value={hotkey.split("+") as string[]}
                      color="moreSubtle"
                    />
                  </Box>
                </Box>
                <Text variant="regular" color="subtle">
                  {("description" in command && command.description) ||
                    command.label ||
                    command.name}
                </Text>
              </Fragment>
            );
          })}
        </Grid>
      </Box>
    );
  };

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
            <Grid gap={5}>{leftCategories.map(renderCategory)}</Grid>
            <Grid gap={5}>{rightCategories.map(renderCategory)}</Grid>
          </Grid>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export const __testing__ = {
  additionalShortcuts,
  getShortcutCategoryColumns,
};
