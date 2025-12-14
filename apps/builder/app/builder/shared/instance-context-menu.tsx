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
import { $selectedInstancePath } from "~/shared/awareness";
import { toggleInstanceShow, canUnwrapInstance } from "~/shared/instance-utils";
import { $propValuesByInstanceSelector } from "~/shared/nano-states";
import { getInstanceKey } from "~/shared/awareness";

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

  const canUnwrap = instancePath ? canUnwrapInstance(instancePath) : false;

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
        <ContextMenuItem onSelect={handleCopy}>
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
        <ContextMenuItem onSelect={handleCut}>
          Cut
          <ContextMenuItemRightSlot>
            <Kbd value={["meta", "x"]} />
          </ContextMenuItemRightSlot>
        </ContextMenuItem>
        <ContextMenuItem onSelect={handleDuplicate}>
          Duplicate
          <ContextMenuItemRightSlot>
            <Kbd value={["meta", "d"]} />
          </ContextMenuItemRightSlot>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={handleHide}>
          {show ? "Hide" : "Show"}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={handleRename}>
          Rename
          <ContextMenuItemRightSlot>
            <Kbd value={["meta", "e"]} />
          </ContextMenuItemRightSlot>
        </ContextMenuItem>
        <ContextMenuItem onSelect={handleAddToken}>
          Add token
          <ContextMenuItemRightSlot>
            <Kbd value={["meta", "enter"]} />
          </ContextMenuItemRightSlot>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={handleWrap}>Wrap</ContextMenuItem>
        <ContextMenuItem disabled={!canUnwrap} onSelect={handleUnwrap}>
          Unwrap
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
