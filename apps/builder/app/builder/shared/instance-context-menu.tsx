import type { ReactNode } from "react";
import { useStore } from "@nanostores/react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuItemRightSlot,
  ContextMenuSeparator,
  ContextMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  theme,
  Kbd,
} from "@webstudio-is/design-system";
import { showAttribute } from "@webstudio-is/react-sdk";
import { instanceText } from "~/shared/copy-paste/plugin-instance";
import { emitCommand } from "./commands";
import {
  $selectedInstancePath,
  $selectedPage,
  getInstanceKey,
} from "~/shared/awareness";
import { toggleInstanceShow, canUnwrapInstance } from "~/shared/instance-utils";
import { $propValuesByInstanceSelector } from "~/shared/nano-states";
import { ROOT_INSTANCE_ID } from "@webstudio-is/sdk";
import type { InstancePath } from "~/shared/awareness";

const getMenuPermissions = (instancePath: InstancePath | undefined) => {
  const instanceId = instancePath?.[0]?.instance.id;
  const rootInstanceId = $selectedPage.get()?.rootInstanceId;

  const isRoot = instanceId === ROOT_INSTANCE_ID;
  const isBody = instanceId === rootInstanceId;
  const isRootOrBody = isRoot || isBody;
  const canUnwrap = instancePath ? canUnwrapInstance(instancePath) : false;

  return {
    canCopy: !isRootOrBody,
    canPaste: !isRoot,
    canCut: !isRootOrBody,
    canDuplicate: !isRootOrBody,
    canHide: !isRoot,
    canRename: !isRoot,
    canWrap: !isRootOrBody,
    canUnwrap,
    canDelete: !isRootOrBody,
  };
};

const MenuItems = ({
  show,
  permissions,
  ItemComponent,
  ItemRightSlot,
  SeparatorComponent,
}: {
  show: boolean;
  permissions: ReturnType<typeof getMenuPermissions>;
  ItemComponent: typeof ContextMenuItem | typeof DropdownMenuItem;
  ItemRightSlot: typeof ContextMenuItemRightSlot;
  SeparatorComponent:
    | typeof ContextMenuSeparator
    | typeof DropdownMenuSeparator;
}) => {
  const instancePath = useStore($selectedInstancePath);

  return (
    <>
      <ItemComponent
        disabled={!permissions.canCopy}
        onSelect={() => {
          const data = instanceText.onCopy?.();
          if (data) {
            navigator.clipboard.writeText(data);
          }
        }}
      >
        Copy
        <ItemRightSlot>
          <Kbd value={["meta", "c"]} />
        </ItemRightSlot>
      </ItemComponent>
      <ItemComponent
        disabled={!permissions.canPaste}
        onSelect={async () => {
          const text = await navigator.clipboard.readText();
          instanceText.onPaste?.(text);
        }}
      >
        Paste
        <ItemRightSlot>
          <Kbd value={["meta", "v"]} />
        </ItemRightSlot>
      </ItemComponent>
      <ItemComponent
        disabled={!permissions.canCut}
        onSelect={() => {
          const data = instanceText.onCut?.();
          if (data) {
            navigator.clipboard.writeText(data);
          }
        }}
      >
        Cut
        <ItemRightSlot>
          <Kbd value={["meta", "x"]} />
        </ItemRightSlot>
      </ItemComponent>
      <ItemComponent
        disabled={!permissions.canDuplicate}
        onSelect={() => {
          emitCommand("duplicateInstance");
        }}
      >
        Duplicate
        <ItemRightSlot>
          <Kbd value={["meta", "d"]} />
        </ItemRightSlot>
      </ItemComponent>
      <SeparatorComponent />
      <ItemComponent
        disabled={!permissions.canHide}
        onSelect={() => {
          if (instancePath?.[0] === undefined) {
            return;
          }
          toggleInstanceShow(instancePath[0].instance.id);
        }}
      >
        {show ? "Hide" : "Show"}
      </ItemComponent>
      <ItemComponent
        disabled={!permissions.canRename}
        onSelect={() => {
          emitCommand("editInstanceLabel");
        }}
      >
        Rename
        <ItemRightSlot>
          <Kbd value={["meta", "e"]} />
        </ItemRightSlot>
      </ItemComponent>
      <ItemComponent
        disabled={!permissions.canWrap}
        onSelect={() => {
          emitCommand("wrap");
        }}
      >
        Wrap
      </ItemComponent>
      <ItemComponent
        disabled={!permissions.canUnwrap}
        onSelect={() => {
          emitCommand("unwrap");
        }}
      >
        Unwrap
      </ItemComponent>
      <SeparatorComponent />
      <ItemComponent
        onSelect={() => {
          emitCommand("focusStyleSources");
        }}
      >
        Add token
        <ItemRightSlot>
          <Kbd value={["meta", "enter"]} />
        </ItemRightSlot>
      </ItemComponent>
      <ItemComponent
        onSelect={() => {
          emitCommand("openSettingsPanel");
        }}
      >
        Open settings
        <ItemRightSlot>
          <Kbd value={["d"]} />
        </ItemRightSlot>
      </ItemComponent>
      <SeparatorComponent />
      <ItemComponent
        disabled={!permissions.canDelete}
        destructive
        onSelect={() => {
          emitCommand("deleteInstanceBuilder");
        }}
      >
        Delete
        <ItemRightSlot>
          <Kbd value={["delete"]} />
        </ItemRightSlot>
      </ItemComponent>
    </>
  );
};

export const InstanceContextMenuItems = () => {
  const instancePath = useStore($selectedInstancePath);
  const propValues = useStore($propValuesByInstanceSelector);

  const instanceSelector = instancePath?.[0]?.instanceSelector;

  const show = instanceSelector
    ? Boolean(
        propValues.get(getInstanceKey(instanceSelector))?.get(showAttribute) ??
          true
      )
    : true;

  const permissions = getMenuPermissions(instancePath);

  return (
    <DropdownMenuContent
      css={{ width: theme.spacing[28] }}
      sideOffset={0}
      align="start"
      side="bottom"
      onCloseAutoFocus={(event) => {
        event.preventDefault();
      }}
    >
      <MenuItems
        show={show}
        permissions={permissions}
        ItemComponent={DropdownMenuItem}
        ItemRightSlot={ContextMenuItemRightSlot}
        SeparatorComponent={DropdownMenuSeparator}
      />
    </DropdownMenuContent>
  );
};

export const InstanceContextMenu = ({ children }: { children: ReactNode }) => {
  const instancePath = useStore($selectedInstancePath);
  const propValues = useStore($propValuesByInstanceSelector);

  const instanceSelector = instancePath?.[0]?.instanceSelector;

  const show = instanceSelector
    ? Boolean(
        propValues.get(getInstanceKey(instanceSelector))?.get(showAttribute) ??
          true
      )
    : true;

  const permissions = getMenuPermissions(instancePath);

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
      <ContextMenuContent css={{ width: theme.spacing[28] }}>
        <MenuItems
          show={show}
          permissions={permissions}
          ItemComponent={ContextMenuItem}
          ItemRightSlot={ContextMenuItemRightSlot}
          SeparatorComponent={ContextMenuSeparator}
        />
      </ContextMenuContent>
    </ContextMenu>
  );
};
