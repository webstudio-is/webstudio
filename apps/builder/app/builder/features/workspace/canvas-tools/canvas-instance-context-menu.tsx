import { useStore } from "@nanostores/react";
import { $instanceContextMenu } from "~/shared/nano-states";
import { useEffect } from "react";
import { selectInstance } from "~/shared/awareness";
import { DropdownMenu, DropdownMenuTrigger } from "@webstudio-is/design-system";
import { InstanceContextMenuItems } from "~/builder/shared/instance-context-menu";
import { $scale } from "~/builder/shared/nano-states";
import { applyScale } from "./outline";

export const CanvasInstanceContextMenu = () => {
  const contextMenu = useStore($instanceContextMenu);
  const scale = useStore($scale);

  useEffect(() => {
    if (contextMenu) {
      selectInstance(contextMenu.instanceSelector);
    }
  }, [contextMenu]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      $instanceContextMenu.set(undefined);
    }
  };

  if (!contextMenu) {
    return;
  }

  // Position from canvas iframe needs to be scaled to match builder's canvas zoom level
  const scaledRect = applyScale(
    {
      left: contextMenu.position.x,
      top: contextMenu.position.y,
      width: 0,
      height: 0,
    },
    scale
  );

  return (
    <DropdownMenu open onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <div
          style={{
            position: "absolute",
            left: scaledRect.left,
            top: scaledRect.top,
            width: 1,
            height: 1,
            pointerEvents: "none",
          }}
        />
      </DropdownMenuTrigger>
      <InstanceContextMenuItems />
    </DropdownMenu>
  );
};
