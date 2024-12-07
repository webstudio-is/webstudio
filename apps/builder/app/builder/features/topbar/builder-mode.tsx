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
} from "@webstudio-is/design-system";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@webstudio-is/design-system";
import {
  $builderMode,
  $isContentModeAllowed,
  $isDesignModeAllowed,
  isBuilderMode,
  setBuilderMode,
  toggleBuilderMode,
} from "~/shared/nano-states";
import { useState } from "react";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";

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

  /*
      preview: {
      icon: <PlayIcon />,
      description: "View the page as it will appear to users",
      title: "Preview",
      shortcut: ["cmd", "shift", "p"],
      enabled: true,
    },
  */

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
    <Flex
      css={{
        gap: theme.spacing[2],

        [`&:hover ${ToolbarToggleItem}`]: {
          background: theme.colors.backgroundTopbarHover,
        },
      }}
    >
      <ToolbarToggleGroup
        type="single"
        value={builderMode}
        onValueChange={() => {
          toggleBuilderMode("preview");
        }}
      >
        <ToolbarToggleItem
          variant="preview"
          value="preview"
          tabIndex={0}
          css={{
            paddingRight: 0,
          }}
        >
          <PlayIcon />
        </ToolbarToggleItem>
      </ToolbarToggleGroup>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <ToolbarToggleItem
            value="preview"
            aria-label="Toggle Preview"
            variant="preview"
            tabIndex={0}
            css={{
              minWidth: "unset",
              padding: 0,
              "&:focus-visible": "unset",
              "&:focus-visible::after": {
                content: "unset",
                outlineWidth: 0,
              },
            }}
          >
            <ChevronDownIcon />
          </ToolbarToggleItem>
        </DropdownMenuTrigger>

        <DropdownMenuPortal>
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
        </DropdownMenuPortal>
      </DropdownMenu>
    </Flex>
  );
};
