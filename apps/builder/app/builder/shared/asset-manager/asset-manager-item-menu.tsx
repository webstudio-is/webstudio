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
  Tooltip,
} from "@webstudio-is/design-system";
import { EllipsesIcon, InfoCircleIcon } from "@webstudio-is/icons";

export type AssetManagerItemActions = Partial<
  Record<
    | "open"
    | "editFile"
    | "openOnCanvas"
    | "settings"
    | "entrySettings"
    | "collectionSettings"
    | "useAsCollection"
    | "convertCollection"
    | "cut"
    | "copy"
    | "paste"
    | "duplicate"
    | "move"
    | "download"
    | "replace"
    | "createFolder"
    | "createEntry"
    | "createFile"
    | "upload"
    | "deleteUnusedAssets"
    | "delete",
    () => void
  >
>;
export type AssetManagerItemActionName = keyof AssetManagerItemActions;
export type AssetManagerItemActionDescriptions = Partial<
  Record<AssetManagerItemActionName, string>
>;

type ItemDefinition = {
  name: keyof AssetManagerItemActions;
  label: string;
  shortcut?: readonly string[];
  separatorBefore?: boolean;
  destructive?: boolean;
};

const itemDefinitions: readonly ItemDefinition[] = [
  { name: "createEntry", label: "New entry" },
  { name: "createFolder", label: "Create folder" },
  { name: "createFile", label: "Create text file" },
  { name: "upload", label: "Upload asset" },
  { name: "open", label: "Open" },
  { name: "editFile", label: "Edit file" },
  { name: "openOnCanvas", label: "Open on canvas" },
  { name: "settings", label: "Settings" },
  { name: "entrySettings", label: "Entry settings" },
  { name: "collectionSettings", label: "Collection settings" },
  { name: "useAsCollection", label: "Use as content collection" },
  {
    name: "convertCollection",
    label: "Convert to regular folder",
    destructive: true,
  },
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
    disabledActionDescriptions,
  }: {
    disabledActions?: ReadonlySet<AssetManagerItemActionName>;
    disabledActionDescriptions?: AssetManagerItemActionDescriptions;
  } = {}
) =>
  itemDefinitions.flatMap((definition) => {
    const action = actions[definition.name];
    const disabledDescription = disabledActionDescriptions?.[definition.name];
    return action === undefined && disabledDescription === undefined
      ? []
      : [
          {
            ...definition,
            action,
            disabled:
              action === undefined ||
              (disabledActions?.has(definition.name) ?? false),
            disabledDescription,
          },
        ];
  });

const AssetManagerItemMenuItems = ({
  actions,
  disabledActions,
  disabledActionDescriptions,
  variant,
}: {
  actions: AssetManagerItemActions;
  disabledActions?: ReadonlySet<AssetManagerItemActionName>;
  disabledActionDescriptions?: AssetManagerItemActionDescriptions;
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
    disabledActionDescriptions,
  }).map((item, index) => (
    <Fragment key={item.name}>
      {item.separatorBefore && index > 0 && <Separator />}
      <Tooltip variant="wrapped" content={item.disabledDescription}>
        <Item
          disabled={item.disabled}
          destructive={item.destructive}
          onSelect={item.action}
          aria-label={
            item.disabledDescription === undefined
              ? undefined
              : `${item.label}. ${item.disabledDescription}`
          }
        >
          {item.label}
          {item.shortcut !== undefined && (
            <ItemRightSlot css={shortcutStyle}>
              <Kbd value={item.shortcut} />
            </ItemRightSlot>
          )}
          {item.disabledDescription !== undefined && (
            <ItemRightSlot css={{ paddingLeft: theme.spacing[3] }}>
              <InfoCircleIcon />
            </ItemRightSlot>
          )}
        </Item>
      </Tooltip>
    </Fragment>
  ));
};

export const AssetManagerItemContextMenuContent = ({
  actions,
  disabledActions,
  disabledActionDescriptions,
}: {
  actions: AssetManagerItemActions;
  disabledActions?: ReadonlySet<AssetManagerItemActionName>;
  disabledActionDescriptions?: AssetManagerItemActionDescriptions;
}) => (
  <ContextMenuContent css={menuContentStyle}>
    <AssetManagerItemMenuItems
      actions={actions}
      disabledActions={disabledActions}
      disabledActionDescriptions={disabledActionDescriptions}
      variant="context"
    />
  </ContextMenuContent>
);

export const AssetManagerItemActionsDropdown = ({
  actions,
  disabledActions,
  disabledActionDescriptions,
  triggerLabel = "Actions",
  triggerTabIndex,
}: {
  actions: AssetManagerItemActions;
  disabledActions?: ReadonlySet<AssetManagerItemActionName>;
  disabledActionDescriptions?: AssetManagerItemActionDescriptions;
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
        disabledActionDescriptions={disabledActionDescriptions}
        variant="dropdown"
      />
    </DropdownMenuContent>
  </DropdownMenu>
);
