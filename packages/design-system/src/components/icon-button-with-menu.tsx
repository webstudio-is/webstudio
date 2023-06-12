import type { IconComponent } from "@webstudio-is/icons";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuArrow,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "./dropdown-menu";
import { IconButton } from "./icon-button";
import { Flex } from "./flex";
import { theme } from "../stitches.config";
import { EnhancedTooltip } from "./enhanced-tooltip";

export const IconButtonWithMenu = ({
  variant,
  icon,
  label,
  value,
  items,
  onChange,
  onHover,
  onReset,
}: {
  variant: "default" | "preset" | "local" | "overwritten" | "remote";
  icon?: JSX.Element;
  label?: string;
  value: string;
  items: Array<{
    label: string;
    name: string;
    icon?: ReturnType<IconComponent>;
  }>;
  onChange?: (value: string) => void;
  onHover?: (value: string) => void;
  onReset?: () => void;
}) => {
  return (
    <DropdownMenu modal={false}>
      <EnhancedTooltip content={label}>
        <DropdownMenuTrigger asChild>
          <IconButton
            variant={variant}
            onPointerDown={(event) => {
              if (event.altKey) {
                event.preventDefault();
                onReset?.();
              }
            }}
          >
            {icon}
          </IconButton>
        </DropdownMenuTrigger>
      </EnhancedTooltip>
      <DropdownMenuPortal>
        <DropdownMenuContent sideOffset={4} collisionPadding={16} side="bottom">
          <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
            {items.map(({ name, label, icon }) => {
              return (
                <DropdownMenuRadioItem
                  key={name}
                  value={label}
                  onFocus={() => onHover?.(name)}
                  onBlur={() => onHover?.(value)}
                >
                  <Flex
                    css={{
                      width: theme.spacing[11],
                      height: theme.spacing[11],
                    }}
                    align="center"
                    justify="center"
                  >
                    {icon}
                  </Flex>
                  {label}
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
          <DropdownMenuArrow />
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
};
