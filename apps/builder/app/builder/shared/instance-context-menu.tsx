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
} from "@webstudio-is/design-system";
import { showAttribute } from "@webstudio-is/react-sdk";
import { instanceText } from "~/shared/copy-paste/plugin-instance";
import { emitCommand } from "./commands";
import { $selectedInstancePath, $selectedPage } from "~/shared/awareness";
import { toggleInstanceShow, canUnwrapInstance } from "~/shared/instance-utils";
import { $propValuesByInstanceSelector } from "~/shared/nano-states";
import { getInstanceKey } from "~/shared/awareness";
import { ROOT_INSTANCE_ID } from "@webstudio-is/sdk";

export const InstanceContextMenu = ({ children }: { children: ReactNode }) => {
  const instancePath = useStore($selectedInstancePath);
  const propValues = useStore($propValuesByInstanceSelector);
  const selectedPage = useStore($selectedPage);

  const instanceSelector = instancePath?.[0]?.instanceSelector;
  const instanceId = instancePath?.[0]?.instance.id;
  const rootInstanceId = selectedPage?.rootInstanceId;

  const show = instanceSelector
    ? Boolean(
        propValues.get(getInstanceKey(instanceSelector))?.get(showAttribute) ??
          true
      )
    : true;

  const canUnwrap = instancePath ? canUnwrapInstance(instancePath) : false;

  // Prevent hiding/copying/cutting/duplicating root or body
  const canHide =
    instanceId !== ROOT_INSTANCE_ID && instanceId !== rootInstanceId;

  const canCopyCutDuplicate =
    instanceId !== ROOT_INSTANCE_ID && instanceId !== rootInstanceId;

  const handleCopy = () => {
    const data = instanceText.onCopy?.();
    if (data) {
      navigator.clipboard.writeText(data);
    }
  };

  const handleCut = () => {
    const data = instanceText.onCut?.();
    if (data) {
      navigator.clipboard.writeText(data);
    }
  };

  const handlePaste = async () => {
    const text = await navigator.clipboard.readText();
    instanceText.onPaste?.(text);
  };

  const handleDuplicate = () => {
    emitCommand("duplicateInstance");
  };

  const handleHide = () => {
    if (instancePath?.[0] === undefined) {
      return;
    }
    toggleInstanceShow(instancePath[0].instance.id);
  };

  const handleRename = () => {
    emitCommand("editInstanceLabel");
  };

  const handleAddToken = () => {
    emitCommand("focusStyleSources");
  };

  const handleOpenSettings = () => {
    emitCommand("openSettingsPanel");
  };

  const handleWrap = () => {
    emitCommand("wrap");
  };

  const handleUnwrap = () => {
    emitCommand("unwrap");
  };

  const handleDelete = () => {
    emitCommand("deleteInstanceBuilder");
  };

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
        <ContextMenuItem disabled={!canCopyCutDuplicate} onSelect={handleCopy}>
          Copy
          <ContextMenuItemRightSlot>
            <Kbd value={["meta", "c"]} />
          </ContextMenuItemRightSlot>
        </ContextMenuItem>
        <ContextMenuItem onSelect={handlePaste}>
          Paste
          <ContextMenuItemRightSlot>
            <Kbd value={["meta", "v"]} />
          </ContextMenuItemRightSlot>
        </ContextMenuItem>
        <ContextMenuItem disabled={!canCopyCutDuplicate} onSelect={handleCut}>
          Cut
          <ContextMenuItemRightSlot>
            <Kbd value={["meta", "x"]} />
          </ContextMenuItemRightSlot>
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!canCopyCutDuplicate}
          onSelect={handleDuplicate}
        >
          Duplicate
          <ContextMenuItemRightSlot>
            <Kbd value={["meta", "d"]} />
          </ContextMenuItemRightSlot>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem disabled={!canHide} onSelect={handleHide}>
          {show ? "Hide" : "Show"}
        </ContextMenuItem>
        <ContextMenuItem onSelect={handleRename}>
          Rename
          <ContextMenuItemRightSlot>
            <Kbd value={["meta", "e"]} />
          </ContextMenuItemRightSlot>
        </ContextMenuItem>
        <ContextMenuItem onSelect={handleWrap}>Wrap</ContextMenuItem>
        <ContextMenuItem disabled={!canUnwrap} onSelect={handleUnwrap}>
          Unwrap
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={handleAddToken}>
          Add token
          <ContextMenuItemRightSlot>
            <Kbd value={["meta", "enter"]} />
          </ContextMenuItemRightSlot>
        </ContextMenuItem>
        <ContextMenuItem onSelect={handleOpenSettings}>
          Open settings
          <ContextMenuItemRightSlot>
            <Kbd value={["d"]} />
          </ContextMenuItemRightSlot>
        </ContextMenuItem>

        {/* <ContextMenuItem onSelect={handleReplaceWith}>
          Replace with
        </ContextMenuItem> */}
        <ContextMenuSeparator />
        <ContextMenuItem destructive onSelect={handleDelete}>
          Delete
          <ContextMenuItemRightSlot>
            <Kbd value={["delete"]} />
          </ContextMenuItemRightSlot>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
