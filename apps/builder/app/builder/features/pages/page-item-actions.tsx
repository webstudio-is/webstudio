import {
  Button,
  ContextMenuItem,
  ContextMenuItemRightSlot,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemRightSlot,
  DropdownMenuTrigger,
  Kbd,
  Tooltip,
} from "@webstudio-is/design-system";
import { EllipsesIcon } from "@webstudio-is/icons";

export type PageItemActions = {
  paste?: () => void;
  copy?: () => void;
  duplicate?: () => void;
  delete?: () => void;
};

type PageItemActionsMenuItemsProps = {
  actions: PageItemActions;
};

const items = [
  { name: "paste", label: "Paste", shortcut: ["meta", "v"] },
  { name: "copy", label: "Copy", shortcut: ["meta", "c"] },
  {
    name: "duplicate",
    label: "Duplicate",
    shortcut: ["meta", "d"],
  },
  {
    name: "delete",
    label: "Delete",
    shortcut: ["backspace"],
  },
] as const;

type ActionItem = (typeof items)[number];

const isDestructive = (name: ActionItem["name"]) => name === "delete";

const ActionContextMenuItem = ({
  item,
  actions,
}: { item: ActionItem } & PageItemActionsMenuItemsProps) => {
  return (
    <ContextMenuItem
      onSelect={actions[item.name]}
      destructive={isDestructive(item.name)}
      disabled={actions[item.name] == null}
    >
      {item.label}
      <ContextMenuItemRightSlot>
        <Kbd value={item.shortcut} />
      </ContextMenuItemRightSlot>
    </ContextMenuItem>
  );
};

export const PageItemContextMenuActions = ({
  actions,
}: PageItemActionsMenuItemsProps) => {
  return (
    <>
      {items.map((item) =>
        item.name === "paste" && actions.paste === undefined ? null : (
          <ActionContextMenuItem
            key={item.name}
            item={item}
            actions={actions}
          />
        )
      )}
    </>
  );
};

export const PageItemActionsDropdown = ({
  actions,
  label = "Actions",
}: PageItemActionsMenuItemsProps & { label?: string }) => {
  return (
    <DropdownMenu>
      <Tooltip content={label} side="bottom">
        <DropdownMenuTrigger asChild>
          <Button
            color="ghost"
            prefix={<EllipsesIcon />}
            aria-label={label}
            tabIndex={2}
          />
        </DropdownMenuTrigger>
      </Tooltip>
      <DropdownMenuContent align="end">
        {items
          .filter((item) => item.name !== "paste")
          .map((item) => (
            <DropdownMenuItem
              key={item.name}
              onSelect={actions[item.name]}
              destructive={isDestructive(item.name)}
              disabled={actions[item.name] == null}
            >
              {item.label}
              <DropdownMenuItemRightSlot>
                <Kbd value={item.shortcut} />
              </DropdownMenuItemRightSlot>
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
