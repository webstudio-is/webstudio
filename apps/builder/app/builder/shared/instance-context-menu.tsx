import type { ReactNode } from "react";
import { canUnwrapInstance } from "~/shared/instance-utils/mutation";
import { useStore } from "@nanostores/react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuItemRightSlot,
  ContextMenuSeparator,
  ContextMenuTrigger,
  theme,
  Kbd,
  Box,
} from "@webstudio-is/design-system";
import { showAttribute } from "@webstudio-is/react-sdk";
import { emitCommand } from "./commands";
import {
  $allSelectedInstanceSelectors,
  $selectedInstancePath,
  $selectedPage,
  $isContentMode,
  $isDesignMode,
  $propValuesByInstanceSelector,
  getInstanceKey,
} from "~/shared/nano-states";
import {
  getInstancePath,
  type InstancePath,
} from "@webstudio-is/project-build/runtime";
import { canDeleteInstanceInContentMode } from "@webstudio-is/project-build/runtime";
import { $instances } from "~/shared/sync/data-stores";
import {
  isComponentDetachable,
  ROOT_INSTANCE_ID,
  type Instances,
} from "@webstudio-is/sdk";

const canDeleteInContentMode = ({
  instancePath,
  instances,
}: {
  instancePath: InstancePath | undefined;
  instances: Instances;
}) => {
  const instanceSelector = instancePath?.[0]?.instanceSelector;
  return (
    instanceSelector !== undefined &&
    canDeleteInstanceInContentMode({ instanceSelector, instances })
  );
};

const getMenuPermissions = ({
  instancePath,
  selectedInstancePaths = instancePath === undefined ? [] : [instancePath],
  selectedInstanceCount = selectedInstancePaths.length,
  isContentMode,
  isDesignMode,
  instances,
}: {
  instancePath: InstancePath | undefined;
  selectedInstancePaths?: InstancePath[];
  selectedInstanceCount?: number;
  isContentMode: boolean;
  isDesignMode: boolean;
  instances: Instances;
}) => {
  const instanceId = instancePath?.[0]?.instance.id;
  const rootInstanceId = $selectedPage.get()?.rootInstanceId;
  const isMultiSelection = selectedInstanceCount > 1;
  const canUseSingleSelectionActions = isMultiSelection === false;

  const isRoot = instanceId === ROOT_INSTANCE_ID;
  const isBody = instanceId === rootInstanceId;
  const isRootOrBody = isRoot || isBody;
  const hasActionableSelection = selectedInstancePaths.some((path) => {
    const selectedInstance = path[0]?.instance;
    const selectedInstanceId = selectedInstance?.id;
    return (
      selectedInstanceId !== undefined &&
      selectedInstanceId !== ROOT_INSTANCE_ID &&
      selectedInstanceId !== rootInstanceId &&
      selectedInstance !== undefined &&
      isComponentDetachable(selectedInstance.component)
    );
  });

  if (isContentMode) {
    return {
      canCopy: hasActionableSelection,
      canPaste: hasActionableSelection,
      canCut: false,
      canDuplicate: false,
      canHide: false,
      canRename: false,
      canWrap: false,
      canUnwrap: false,
      canConvert: false,
      canAddToken: false,
      canOpenSettings: canUseSingleSelectionActions,
      canDelete: canDeleteInContentMode({ instancePath, instances }),
    };
  }

  const canMutateDesign = isDesignMode;
  const canUnwrap =
    canMutateDesign && instancePath ? canUnwrapInstance(instancePath) : false;

  return {
    canCopy: canMutateDesign && hasActionableSelection,
    canPaste: canMutateDesign && !isRoot,
    canCut: canMutateDesign && hasActionableSelection,
    canDuplicate: canMutateDesign && hasActionableSelection,
    canHide: canMutateDesign && !isRoot && canUseSingleSelectionActions,
    canRename: canMutateDesign && !isRoot && canUseSingleSelectionActions,
    canWrap: canMutateDesign && !isRootOrBody && canUseSingleSelectionActions,
    canUnwrap: canUnwrap && canUseSingleSelectionActions,
    canConvert:
      canMutateDesign && !isRootOrBody && canUseSingleSelectionActions,
    canAddToken: canMutateDesign && canUseSingleSelectionActions,
    canOpenSettings: canUseSingleSelectionActions,
    canDelete: canMutateDesign && hasActionableSelection,
  };
};

export const MenuItems = () => {
  const instancePath = useStore($selectedInstancePath);
  const selectedInstanceSelectors = useStore($allSelectedInstanceSelectors);
  const instances = useStore($instances);
  const propValues = useStore($propValuesByInstanceSelector);
  const isContentMode = useStore($isContentMode);
  const isDesignMode = useStore($isDesignMode);

  const instanceSelector = instancePath?.[0]?.instanceSelector;

  const show = instanceSelector
    ? Boolean(
        propValues.get(getInstanceKey(instanceSelector))?.get(showAttribute) ??
        true
      )
    : true;

  const permissions = getMenuPermissions({
    instancePath,
    selectedInstanceCount: selectedInstanceSelectors.length,
    selectedInstancePaths: selectedInstanceSelectors
      .map((instanceSelector) => getInstancePath(instanceSelector, instances))
      .filter((path): path is InstancePath => path !== undefined),
    isContentMode,
    isDesignMode,
    instances,
  });
  const shortcutColor = (isEnabled: boolean): "subtle" | "moreSubtle" =>
    isEnabled ? "subtle" : "moreSubtle";

  return (
    <Box css={{ width: theme.spacing[28] }}>
      <ContextMenuItem
        disabled={!permissions.canCopy}
        onSelect={() => {
          emitCommand("copy");
        }}
      >
        Copy
        <ContextMenuItemRightSlot>
          <Kbd
            value={["meta", "c"]}
            color={shortcutColor(permissions.canCopy)}
          />
        </ContextMenuItemRightSlot>
      </ContextMenuItem>
      <ContextMenuItem
        disabled={!permissions.canPaste}
        onSelect={() => {
          emitCommand("paste");
        }}
      >
        Paste
        <ContextMenuItemRightSlot>
          <Kbd
            value={["meta", "v"]}
            color={shortcutColor(permissions.canPaste)}
          />
        </ContextMenuItemRightSlot>
      </ContextMenuItem>
      <ContextMenuItem
        disabled={!permissions.canCut}
        onSelect={() => {
          emitCommand("cut");
        }}
      >
        Cut
        <ContextMenuItemRightSlot>
          <Kbd
            value={["meta", "x"]}
            color={shortcutColor(permissions.canCut)}
          />
        </ContextMenuItemRightSlot>
      </ContextMenuItem>
      <ContextMenuItem
        disabled={!permissions.canDuplicate}
        onSelect={() => {
          emitCommand("duplicateInstance");
        }}
      >
        Duplicate
        <ContextMenuItemRightSlot>
          <Kbd
            value={["meta", "d"]}
            color={shortcutColor(permissions.canDuplicate)}
          />
        </ContextMenuItemRightSlot>
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        disabled={!permissions.canHide}
        onSelect={() => {
          emitCommand("toggleShow");
        }}
      >
        {show ? "Hide" : "Show"}
      </ContextMenuItem>
      <ContextMenuItem
        disabled={!permissions.canRename}
        onSelect={() => {
          emitCommand("editInstanceLabel");
        }}
      >
        Rename
        <ContextMenuItemRightSlot>
          <Kbd
            value={["meta", "e"]}
            color={shortcutColor(permissions.canRename)}
          />
        </ContextMenuItemRightSlot>
      </ContextMenuItem>
      <ContextMenuItem
        disabled={!permissions.canWrap}
        onSelect={() => {
          emitCommand("wrap");
        }}
      >
        Wrap
        <ContextMenuItemRightSlot>
          <Kbd
            value={["meta", "alt", "g"]}
            color={shortcutColor(permissions.canWrap)}
          />
        </ContextMenuItemRightSlot>
      </ContextMenuItem>
      <ContextMenuItem
        disabled={!permissions.canUnwrap}
        onSelect={() => {
          emitCommand("unwrap");
        }}
      >
        Unwrap
        <ContextMenuItemRightSlot>
          <Kbd
            value={["meta", "shift", "g"]}
            color={shortcutColor(permissions.canUnwrap)}
          />
        </ContextMenuItemRightSlot>
      </ContextMenuItem>
      <ContextMenuItem
        disabled={!permissions.canConvert}
        onSelect={() => {
          emitCommand("convert");
        }}
      >
        Convert
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        disabled={!permissions.canAddToken}
        onSelect={() => {
          emitCommand("focusStyleSources");
        }}
      >
        Add token
        <ContextMenuItemRightSlot>
          <Kbd
            value={["meta", "enter"]}
            color={shortcutColor(permissions.canAddToken)}
          />
        </ContextMenuItemRightSlot>
      </ContextMenuItem>
      <ContextMenuItem
        disabled={!permissions.canOpenSettings}
        onSelect={() => {
          emitCommand("openSettingsPanel");
        }}
      >
        Open settings
        <ContextMenuItemRightSlot>
          <Kbd
            value={["d"]}
            color={shortcutColor(permissions.canOpenSettings)}
          />
        </ContextMenuItemRightSlot>
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        disabled={!permissions.canDelete}
        destructive
        onSelect={() => {
          emitCommand("deleteInstanceBuilder");
        }}
      >
        Delete
        <ContextMenuItemRightSlot>
          <Kbd
            value={["delete"]}
            color={shortcutColor(permissions.canDelete)}
          />
        </ContextMenuItemRightSlot>
      </ContextMenuItem>
    </Box>
  );
};

export const InstanceContextMenu = ({ children }: { children: ReactNode }) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <MenuItems />
      </ContextMenuContent>
    </ContextMenu>
  );
};

export const __testing__ = {
  canDeleteInContentMode,
  getMenuPermissions,
};
