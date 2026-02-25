import { selectorIdAttribute } from "@webstudio-is/react-sdk";
import {
  $instanceContextMenu,
  $textEditingInstanceSelector,
} from "~/shared/nano-states";

export const subscribeInstanceContextMenu = () => {
  const handleContextMenu = (event: MouseEvent) => {
    // Allow native context menu when editing text content
    if ($textEditingInstanceSelector.get() !== undefined) {
      return;
    }

    const target = event.target as HTMLElement;
    const element = target.closest(`[${selectorIdAttribute}]`);
    const selectorId = element?.getAttribute(selectorIdAttribute);

    if (selectorId) {
      event.preventDefault();
      const instanceSelector = selectorId.split(",");
      $instanceContextMenu.set({
        position: { x: event.clientX, y: event.clientY },
        instanceSelector,
      });
    }
  };

  document.addEventListener("contextmenu", handleContextMenu);

  return () => {
    document.removeEventListener("contextmenu", handleContextMenu);
  };
};
