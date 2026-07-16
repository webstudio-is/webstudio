import { Fragment, type ReactNode } from "react";
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
  Tooltip,
} from "@webstudio-is/design-system";
import { EllipsesIcon } from "@webstudio-is/icons";

export type AssetManagerItemActions = Partial<
  Record<
    | "open"
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
  disabledActions?: ReadonlySet<AssetManagerItemActionName>
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

export const AssetManagerItemContextMenuContent = ({
  actions,
  disabledActions,
}: {
  actions: AssetManagerItemActions;
  disabledActions?: ReadonlySet<AssetManagerItemActionName>;
}) => (
  <ContextMenuContent>
    {getAssetManagerItemMenuItems(actions, disabledActions).map(
      (item, index) => (
        <Fragment key={item.name}>
          {item.separatorBefore && index > 0 && <ContextMenuSeparator />}
          <ContextMenuItem
            disabled={item.disabled}
            destructive={item.destructive}
            onSelect={item.action}
          >
            {item.label}
          </ContextMenuItem>
        </Fragment>
      )
    )}
  </ContextMenuContent>
);

export const AssetManagerItemActionsDropdown = ({
  actions,
  disabledActions,
  children,
}: {
  actions: AssetManagerItemActions;
  disabledActions?: ReadonlySet<AssetManagerItemActionName>;
  children?: ReactNode;
}) => (
  <DropdownMenu>
    <Tooltip content="Actions" side="bottom">
      <DropdownMenuTrigger asChild>
        {children ?? (
          <SmallIconButton aria-label="Actions" icon={<EllipsesIcon />} />
        )}
      </DropdownMenuTrigger>
    </Tooltip>
    <DropdownMenuContent align="end">
      {getAssetManagerItemMenuItems(actions, disabledActions).map(
        (item, index) => (
          <Fragment key={item.name}>
            {item.separatorBefore && index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              disabled={item.disabled}
              destructive={item.destructive}
              onSelect={item.action}
            >
              {item.label}
            </DropdownMenuItem>
          </Fragment>
        )
      )}
    </DropdownMenuContent>
  </DropdownMenu>
);
