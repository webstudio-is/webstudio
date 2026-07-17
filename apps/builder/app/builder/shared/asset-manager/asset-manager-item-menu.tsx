import { Fragment } from "react";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  SmallIconButton,
} from "@webstudio-is/design-system";
import { EllipsesIcon } from "@webstudio-is/icons";

export type AssetManagerItemActions = Partial<
  Record<
    | "open"
    | "settings"
    | "rename"
    | "cut"
    | "copy"
    | "paste"
    | "duplicate"
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
  separatorBefore?: boolean;
  destructive?: boolean;
};

const itemDefinitions: readonly ItemDefinition[] = [
  { name: "createFolder", label: "Create folder" },
  { name: "upload", label: "Upload asset" },
  { name: "open", label: "Open" },
  { name: "settings", label: "Settings" },
  { name: "rename", label: "Rename" },
  { name: "cut", label: "Cut", separatorBefore: true },
  { name: "copy", label: "Copy" },
  { name: "paste", label: "Paste" },
  { name: "duplicate", label: "Duplicate" },
  { name: "download", label: "Download", separatorBefore: true },
  { name: "replace", label: "Replace file" },
  {
    name: "deleteUnusedAssets",
    label: "Delete unused assets",
    separatorBefore: true,
  },
  { name: "delete", label: "Delete", separatorBefore: true, destructive: true },
] as const;

export const getAssetManagerItemMenuItems = (
  actions: AssetManagerItemActions,
  {
    disabledActions,
    hiddenActions,
  }: {
    disabledActions?: ReadonlySet<AssetManagerItemActionName>;
    hiddenActions?: ReadonlySet<AssetManagerItemActionName>;
  } = {}
) =>
  itemDefinitions.flatMap((definition) =>
    actions[definition.name] === undefined ||
    hiddenActions?.has(definition.name)
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
  hiddenActions,
  variant,
}: {
  actions: AssetManagerItemActions;
  disabledActions?: ReadonlySet<AssetManagerItemActionName>;
  hiddenActions?: ReadonlySet<AssetManagerItemActionName>;
  variant: "context" | "dropdown";
}) => {
  const Item = variant === "context" ? ContextMenuItem : DropdownMenuItem;
  const Separator =
    variant === "context" ? ContextMenuSeparator : DropdownMenuSeparator;
  return getAssetManagerItemMenuItems(actions, {
    disabledActions,
    hiddenActions,
  }).map((item, index) => (
    <Fragment key={item.name}>
      {item.separatorBefore && index > 0 && <Separator />}
      <Item
        disabled={item.disabled}
        destructive={item.destructive}
        onSelect={item.action}
      >
        {item.label}
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
  <ContextMenuContent>
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
  hiddenActions,
  triggerLabel = "Actions",
  triggerTabIndex,
}: {
  actions: AssetManagerItemActions;
  disabledActions?: ReadonlySet<AssetManagerItemActionName>;
  hiddenActions?: ReadonlySet<AssetManagerItemActionName>;
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
    <DropdownMenuContent align="end" css={{ minWidth: 120 }}>
      <AssetManagerItemMenuItems
        actions={actions}
        disabledActions={disabledActions}
        hiddenActions={hiddenActions}
        variant="dropdown"
      />
    </DropdownMenuContent>
  </DropdownMenu>
);
