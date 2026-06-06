import type { ReactNode } from "react";
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
  $selectedInstancePath,
  $selectedPage,
  $isContentMode,
  $isDesignMode,
  getInstanceKey,
} from "~/shared/nano-states";
import {
  canDeleteInstanceInContentMode,
  canUnwrapInstance,
} from "~/shared/instance-utils";
import { $propValuesByInstanceSelector } from "~/shared/nano-states";
import { $instances } from "~/shared/sync/data-stores";
import { ROOT_INSTANCE_ID, type Instances } from "@webstudio-is/sdk";
import type { InstancePath } from "~/shared/nano-states";

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
  isContentMode,
  isDesignMode,
  instances,
}: {
  instancePath: InstancePath | undefined;
  isContentMode: boolean;
  isDesignMode: boolean;
  instances: Instances;
}) => {
  const instanceId = instancePath?.[0]?.instance.id;
  const rootInstanceId = $selectedPage.get()?.rootInstanceId;

  const isRoot = instanceId === ROOT_INSTANCE_ID;
  const isBody = instanceId === rootInstanceId;
  const isRootOrBody = isRoot || isBody;

  if (isContentMode) {
    return {
      canCopy: false,
      canPaste: false,
      canCut: false,
      canDuplicate: false,
      canHide: false,
      canRename: false,
      canWrap: false,
      canUnwrap: false,
      canConvert: false,
      canAddToken: false,
      canOpenSettings: true,
      canDelete: canDeleteInContentMode({ instancePath, instances }),
    };
  }

  const canMutateDesign = isDesignMode;
  const canUnwrap =
    canMutateDesign && instancePath ? canUnwrapInstance(instancePath) : false;

  return {
    canCopy: canMutateDesign && !isRootOrBody,
    canPaste: canMutateDesign && !isRoot,
    canCut: canMutateDesign && !isRootOrBody,
    canDuplicate: canMutateDesign && !isRootOrBody,
    canHide: canMutateDesign && !isRoot,
    canRename: canMutateDesign && !isRoot,
    canWrap: canMutateDesign && !isRootOrBody,
    canUnwrap,
    canConvert: canMutateDesign && !isRootOrBody,
    canAddToken: canMutateDesign,
    canOpenSettings: true,
    canDelete: canMutateDesign && !isRootOrBody,
  };
};

export const MenuItems = () => {
  const instancePath = useStore($selectedInstancePath);
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
    isContentMode,
    isDesignMode,
    instances,
  });

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
          <Kbd value={["meta", "c"]} />
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
          <Kbd value={["meta", "v"]} />
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
          <Kbd value={["meta", "x"]} />
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
          <Kbd value={["meta", "d"]} />
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
          <Kbd value={["meta", "e"]} />
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
          <Kbd value={["meta", "alt", "g"]} />
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
          <Kbd value={["meta", "shift", "g"]} />
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
      {permissions.canAddToken && (
        <ContextMenuItem
          onSelect={() => {
            emitCommand("focusStyleSources");
          }}
        >
          Add token
          <ContextMenuItemRightSlot>
            <Kbd value={["meta", "enter"]} />
          </ContextMenuItemRightSlot>
        </ContextMenuItem>
      )}
      {permissions.canOpenSettings && (
        <ContextMenuItem
          onSelect={() => {
            emitCommand("openSettingsPanel");
          }}
        >
          Open settings
          <ContextMenuItemRightSlot>
            <Kbd value={["d"]} />
          </ContextMenuItemRightSlot>
        </ContextMenuItem>
      )}
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
          <Kbd value={["delete"]} />
        </ContextMenuItemRightSlot>
      </ContextMenuItem>
    </Box>
  );
};

export const InstanceContextMenu = ({ children }: { children: ReactNode }) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger
        asChild
        onPointerDown={(event) => {
          if (!(event.target instanceof HTMLElement)) {
            return;
          }
          event.target.closest<HTMLElement>("[data-tree-button]")?.click();
        }}
      >
        {children}
      </ContextMenuTrigger>
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
