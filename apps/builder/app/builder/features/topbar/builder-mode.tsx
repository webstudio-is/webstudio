import { useStore } from "@nanostores/react";
import {
  ChevronDownIcon,
  NotebookAndPenIcon,
  PaintBrushIcon,
  PlayIcon,
} from "@webstudio-is/icons";
import {
  Box,
  DropdownMenuItemRightSlot,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  Flex,
  Kbd,
  MenuCheckedIcon,
  menuItemCss,
  theme,
  ToolbarToggleGroup,
  ToolbarToggleItem,
  Tooltip,
  Text,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@webstudio-is/design-system";
import {
  $builderMode,
  $isContentModeAllowed,
  $isDesignModeAllowed,
  isBuilderMode,
  setBuilderMode,
} from "~/shared/nano-states";
import { useState } from "react";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { emitCommand } from "~/builder/shared/commands";

export const BuilderModeDropDown = () => {
  const builderMode = useStore($builderMode);
  const isContentModeAllowed = useStore($isContentModeAllowed);
  const isDesignModeAllowed = useStore($isDesignModeAllowed);

  const menuItems = {
    design: {
      icon: <PaintBrushIcon />,
      description: "Edit components, styles, and properties",
      title: "Design",
      shortcut: ["cmd", "shift", "d"],
      enabled: isDesignModeAllowed,
    },
    content: {
      icon: <NotebookAndPenIcon />,
      description: "Modify the page content",
      title: "Content",
      shortcut: ["cmd", "shift", "c"],
      enabled: isContentModeAllowed && isFeatureEnabled("contentEditableMode"),
    },
  } as const;

  const [activeMode, setActiveMode] = useState<
    keyof typeof menuItems | undefined
  >();

  const handleFocus = (mode: keyof typeof menuItems) => () => {
    setActiveMode(mode);
  };

  const handleBlur = () => {
    setActiveMode(undefined);
  };

  return (
    <Flex align="center">
      <Tooltip
        content={
          <Flex gap="1">
            <Text variant="regular">Toggle preview</Text>
            <Kbd value={["cmd", "shift", "p"]} />
          </Flex>
        }
      >
        <ToolbarToggleGroup
          type="single"
          value={builderMode}
          onValueChange={() => {
            emitCommand("togglePreviewMode");
          }}
        >
          <ToolbarToggleItem variant="preview" value="preview">
            <PlayIcon />
          </ToolbarToggleItem>
        </ToolbarToggleGroup>
      </Tooltip>
      <DropdownMenu>
        <Tooltip content={"Choose mode"}>
          <DropdownMenuTrigger asChild>
            <ToolbarToggleItem
              tabIndex={0}
              aria-label="Choose mode"
              variant="chevron"
              value="chevron"
            >
              <ChevronDownIcon />
            </ToolbarToggleItem>
          </DropdownMenuTrigger>
        </Tooltip>
        <DropdownMenuContent
          sideOffset={4}
          collisionPadding={16}
          side="bottom"
          loop
        >
          <DropdownMenuRadioGroup
            value={builderMode}
            onValueChange={(value) => {
              if (isBuilderMode(value)) {
                setBuilderMode(value);
              }
            }}
          >
            {Object.entries(menuItems)
              .filter(([_, { enabled }]) => enabled)
              .map(([mode, { icon, title, shortcut }]) => (
                <DropdownMenuRadioItem
                  key={mode}
                  value={mode}
                  onFocus={handleFocus(mode as keyof typeof menuItems)}
                  onBlur={handleBlur}
                  icon={<MenuCheckedIcon />}
                >
                  <Flex css={{ px: theme.spacing[3] }} gap={2}>
                    {icon}
                    <Box>{title}</Box>
                  </Flex>
                  <DropdownMenuItemRightSlot>
                    <Kbd value={shortcut} />
                  </DropdownMenuItemRightSlot>
                  &nbsp;
                </DropdownMenuRadioItem>
              ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />

          <div className={menuItemCss({ hint: true })}>
            <Box css={{ width: theme.spacing[25] }}>
              {activeMode
                ? menuItems[activeMode].description
                : "Select Design or Content mode"}
            </Box>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </Flex>
  );
};
