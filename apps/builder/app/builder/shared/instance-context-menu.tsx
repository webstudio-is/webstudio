import { useRef, type ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  theme,
} from "@webstudio-is/design-system";
import { instanceText } from "~/shared/copy-paste/plugin-instance";
import { emitCommand } from "./commands";

export const InstanceContextMenu = ({ children }: { children: ReactNode }) => {
  const lastClickedButton = useRef<HTMLElement | undefined>();

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
    // @todo implement hide functionality
  };

  const handleWrap = () => {
    emitCommand("wrap");
  };

  const handleUnwrap = () => {
    emitCommand("unwrap");
  };

  const handleReplaceWith = () => {
    // @todo open replace with menu/command panel
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
          const button =
            event.target.closest<HTMLElement>("[data-tree-button]");
          if (button) {
            lastClickedButton.current = button;
            const instanceId = button.getAttribute("data-instance-id");
            console.log("Context menu instance ID:", instanceId);
            // Select the instance when right-clicking
            button.click();
          }
        }}
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent css={{ width: theme.spacing[28] }}>
        <ContextMenuItem onSelect={handleCopy}>Copy</ContextMenuItem>
        <ContextMenuItem onSelect={handlePaste}>Paste</ContextMenuItem>
        <ContextMenuItem onSelect={handleCut}>Cut</ContextMenuItem>
        <ContextMenuItem onSelect={handleDuplicate}>Duplicate</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={handleHide}>Hide</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={handleWrap}>Wrap</ContextMenuItem>
        <ContextMenuItem onSelect={handleUnwrap}>Unwrap</ContextMenuItem>
        {/* <ContextMenuItem onSelect={handleReplaceWith}>
          Replace with
        </ContextMenuItem> */}
        <ContextMenuSeparator />
        <ContextMenuItem destructive onSelect={handleDelete}>
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
