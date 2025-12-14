import { selectorIdAttribute } from "@webstudio-is/react-sdk";
import { $instanceContextMenu } from "~/shared/nano-states";

export const subscribeInstanceContextMenu = () => {
  const handleContextMenu = (event: MouseEvent) => {
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
