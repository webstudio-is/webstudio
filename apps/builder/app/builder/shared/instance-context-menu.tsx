import { useRef, type ReactNode } from "react";
import { useStore } from "@nanostores/react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  theme,
} from "@webstudio-is/design-system";
import { showAttribute } from "@webstudio-is/react-sdk";
import { instanceText } from "~/shared/copy-paste/plugin-instance";
import { emitCommand } from "./commands";
import { $selectedInstancePath } from "~/shared/awareness";
import { toggleInstanceShow } from "~/shared/instance-utils";
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
        <ContextMenuItem onSelect={handleCopy}>Copy</ContextMenuItem>
        <ContextMenuItem onSelect={handlePaste}>Paste</ContextMenuItem>
        <ContextMenuItem onSelect={handleCut}>Cut</ContextMenuItem>
        <ContextMenuItem onSelect={handleDuplicate}>Duplicate</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={handleHide}>
          {show ? "Hide" : "Show"}
        </ContextMenuItem>
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
