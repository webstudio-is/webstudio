import { Fragment } from "react";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuItemRightSlot,
  ContextMenuSeparator,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemRightSlot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Kbd,
  SmallIconButton,
  theme,
} from "@webstudio-is/design-system";
import { EllipsesIcon } from "@webstudio-is/icons";

export type AssetManagerItemActions = Partial<
  Record<
    | "open"
    | "settings"
    | "cut"
    | "copy"
    | "paste"
    | "duplicate"
    | "move"
    | "download"
    | "replace"
    | "createFolder"
    | "upload"
    | "deleteUnusedAssets"
    | "delete",
    () => void
  >
>;
export type AssetManagerItemActionName = keyof AssetManagerItemActions;

type ItemDefinition = {
  name: keyof AssetManagerItemActions;
  label: string;
  shortcut?: readonly string[];
  separatorBefore?: boolean;
  destructive?: boolean;
};

const itemDefinitions: readonly ItemDefinition[] = [
  { name: "createFolder", label: "Create folder" },
  { name: "upload", label: "Upload asset" },
  { name: "open", label: "Open" },
  { name: "settings", label: "Settings" },
  {
    name: "cut",
    label: "Cut",
    shortcut: ["meta", "x"],
    separatorBefore: true,
  },
  { name: "copy", label: "Copy", shortcut: ["meta", "c"] },
  { name: "paste", label: "Paste", shortcut: ["meta", "v"] },
  { name: "duplicate", label: "Duplicate", shortcut: ["meta", "d"] },
  { name: "move", label: "Move" },
  { name: "download", label: "Download", separatorBefore: true },
  { name: "replace", label: "Replace file" },
  {
    name: "deleteUnusedAssets",
    label: "Delete unused assets",
    separatorBefore: true,
  },
  {
    name: "delete",
    label: "Delete",
    shortcut: ["backspace"],
    separatorBefore: true,
    destructive: true,
  },
] as const;

const menuContentStyle = { minWidth: 120 };
const shortcutStyle = { paddingLeft: theme.spacing[5] };

export const getAssetManagerItemMenuItems = (
  actions: AssetManagerItemActions,
  {
    disabledActions,
  }: {
    disabledActions?: ReadonlySet<AssetManagerItemActionName>;
  } = {}
) =>
  itemDefinitions.flatMap((definition) =>
    actions[definition.name] === undefined
      ? []
      : [
          {
            ...definition,
            action: actions[definition.name],
            disabled: disabledActions?.has(definition.name) ?? false,
          },
        ]
  );

const AssetManagerItemMenuItems = ({
  actions,
  disabledActions,
  variant,
}: {
  actions: AssetManagerItemActions;
  disabledActions?: ReadonlySet<AssetManagerItemActionName>;
  variant: "context" | "dropdown";
}) => {
  const Item = variant === "context" ? ContextMenuItem : DropdownMenuItem;
  const ItemRightSlot =
    variant === "context"
      ? ContextMenuItemRightSlot
      : DropdownMenuItemRightSlot;
  const Separator =
    variant === "context" ? ContextMenuSeparator : DropdownMenuSeparator;
  return getAssetManagerItemMenuItems(actions, {
    disabledActions,
  }).map((item, index) => (
    <Fragment key={item.name}>
      {item.separatorBefore && index > 0 && <Separator />}
      <Item
        disabled={item.disabled}
        destructive={item.destructive}
        onSelect={item.action}
      >
        {item.label}
        {item.shortcut !== undefined && (
          <ItemRightSlot css={shortcutStyle}>
            <Kbd value={item.shortcut} />
          </ItemRightSlot>
        )}
      </Item>
    </Fragment>
  ));
};

export const AssetManagerItemContextMenuContent = ({
  actions,
  disabledActions,
}: {
  actions: AssetManagerItemActions;
  disabledActions?: ReadonlySet<AssetManagerItemActionName>;
}) => (
  <ContextMenuContent css={menuContentStyle}>
    <AssetManagerItemMenuItems
      actions={actions}
      disabledActions={disabledActions}
      variant="context"
    />
  </ContextMenuContent>
);

export const AssetManagerItemActionsDropdown = ({
  actions,
  disabledActions,
  triggerLabel = "Actions",
  triggerTabIndex,
}: {
  actions: AssetManagerItemActions;
  disabledActions?: ReadonlySet<AssetManagerItemActionName>;
  triggerLabel?: string;
  triggerTabIndex?: number;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <SmallIconButton
        aria-label={triggerLabel}
        tabIndex={triggerTabIndex}
        icon={<EllipsesIcon />}
      />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" css={menuContentStyle}>
      <AssetManagerItemMenuItems
        actions={actions}
        disabledActions={disabledActions}
        variant="dropdown"
      />
    </DropdownMenuContent>
  </DropdownMenu>
);
