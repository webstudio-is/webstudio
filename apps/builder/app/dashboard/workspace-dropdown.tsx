import type { ComponentProps, ReactNode } from "react";
import {
  Avatar,
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  MenuCheckedIcon,
  theme,
} from "@webstudio-is/design-system";
import { ChevronDownIcon } from "@webstudio-is/icons";

export type WorkspaceDropdownItem = {
  id: string;
  name: string;
  disabled?: boolean;
  suffix?: ReactNode;
};

export type WorkspaceDropdownGroup = {
  label: string;
  items: Array<WorkspaceDropdownItem>;
};

export const WorkspaceDropdown = ({
  groups,
  selectedId,
  onSelectedChange,
  color,
  children,
}: {
  groups: Array<WorkspaceDropdownGroup>;
  selectedId: string | undefined;
  onSelectedChange: (id: string) => void;
  color?: ComponentProps<typeof Button>["color"];
  children?: ReactNode;
}) => {
  const selectedItem = groups
    .flatMap((group) => group.items)
    .find((item) => item.id === selectedId);

  const triggerLabel = selectedItem?.name ?? "Select workspace";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          color={color}
          prefix={
            <Avatar
              size="small"
              fallback={triggerLabel.charAt(0).toLocaleUpperCase()}
              alt={triggerLabel}
              css={{ borderRadius: theme.borderRadius[4] }}
            />
          }
          suffix={<ChevronDownIcon />}
        >
          {triggerLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup
          value={selectedId ?? ""}
          onValueChange={onSelectedChange}
        >
          {groups.map((group) => (
            <DropdownMenuGroup key={group.label}>
              <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
              {group.items.map((item) => (
                <DropdownMenuRadioItem
                  key={item.id}
                  value={item.id}
                  icon={<MenuCheckedIcon />}
                  disabled={item.disabled}
                >
                  {item.name}
                  {item.suffix}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuGroup>
          ))}
        </DropdownMenuRadioGroup>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
