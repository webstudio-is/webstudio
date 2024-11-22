import { useStore } from "@nanostores/react";
import { EditIcon, PaintBrushIcon, PlayIcon } from "@webstudio-is/icons";
import {
  Box,
  DropdownMenuItemRightSlot,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  Flex,
  Kbd,
  menuItemCss,
  styled,
  theme,
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
  type BuilderMode,
} from "~/shared/nano-states";
import { useState } from "react";

const StyledMenuItem = styled(DropdownMenuRadioItem, {
  "&:where([data-state='checked'])": {
    backgroundColor: `oklch(from ${theme.colors.backgroundItemMenuItemHover} l c h / 0.3)`,
  },
});

export const BuilderModeDropDown = () => {
  const builderMode = useStore($builderMode);
  const isContentModeAllowed = useStore($isContentModeAllowed);
  const isDesignModeAllowed = useStore($isDesignModeAllowed);

  const menuItems = {
    preview: {
      icon: <PlayIcon />,
      description: "View the page as it will appear to users",
      title: "Preview",
      shortcut: ["cmd", "shift", "p"],
      enabled: true,
    },
    design: {
      icon: <PaintBrushIcon />,
      description: "Edit components, styles, and properties",
      title: "Design",
      shortcut: ["cmd", "shift", "d"],
      enabled: isDesignModeAllowed,
    },
    content: {
      icon: <EditIcon />,
      description: "Modify the page content",
      title: "Build",
      shortcut: ["cmd", "shift", "b"],
      enabled: isContentModeAllowed,
    },
  } as const;

  const [activeMode, setActiveMode] = useState<BuilderMode | undefined>();

  const handleFocus = (mode: BuilderMode) => () => {
    setActiveMode(mode);
  };

  const handleBlur = () => {
    setActiveMode(undefined);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ToolbarToggleItem
          value="preview"
          aria-label="Toggle Preview"
          variant="preview"
          tabIndex={0}
        >
          {menuItems[builderMode].icon}
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
                <StyledMenuItem
                  key={mode}
                  value={mode}
                  onFocus={handleFocus(mode as BuilderMode)}
                  onBlur={handleBlur}
                >
                  <Flex
                    css={{ py: theme.spacing[4], px: theme.spacing[5] }}
                    gap={2}
                  >
                    {icon}
                    <Box>{title}</Box>
                  </Flex>
                  <DropdownMenuItemRightSlot>
                    <Kbd value={shortcut} />
                  </DropdownMenuItemRightSlot>
                </StyledMenuItem>
              ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />

          <div className={menuItemCss({ hint: true })}>
            <Box css={{ width: theme.spacing[25] }}>
              {menuItems[activeMode ?? builderMode].description}
            </Box>
          </div>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
};
