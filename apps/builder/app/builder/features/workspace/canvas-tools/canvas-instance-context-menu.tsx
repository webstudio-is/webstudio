import { useStore } from "@nanostores/react";
import { $instanceContextMenu } from "~/shared/nano-states";
import { useEffect, useRef } from "react";
import { selectInstance } from "~/shared/awareness";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
} from "@webstudio-is/design-system";
import { MenuItems } from "~/builder/shared/instance-context-menu";
import { $scale, $canvasRect } from "~/builder/shared/nano-states";
import { applyScale } from "./outline";

export const CanvasInstanceContextMenu = () => {
  const contextMenu = useStore($instanceContextMenu);
  const scale = useStore($scale);
  const canvasRect = useStore($canvasRect);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contextMenu && triggerRef.current && canvasRect) {
      selectInstance(contextMenu.instanceSelector);

      // Calculate the scaled and offset position
      const scaledPosition = applyScale(
        {
          left: contextMenu.position.x,
          top: contextMenu.position.y,
          width: 0,
          height: 0,
        },
        scale
      );

      // Trigger context menu by dispatching a contextmenu event with proper coordinates
      const event = new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: canvasRect.left + scaledPosition.left,
        clientY: canvasRect.top + scaledPosition.top,
      });
      triggerRef.current.dispatchEvent(event);
    }
  }, [contextMenu, canvasRect, scale]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      $instanceContextMenu.set(undefined);
    }
  };

  if (!contextMenu || !canvasRect) {
    return;
  }

  return (
    <ContextMenu onOpenChange={handleOpenChange}>
      <ContextMenuTrigger ref={triggerRef} style={{ display: "none" }} />
      <ContextMenuContent>
        <MenuItems />
      </ContextMenuContent>
    </ContextMenu>
  );
};
