import { useEffect } from "react";
import { $breakpoints } from "~/shared/sync/data-stores";
import { $selectedBreakpointId } from "~/shared/nano-states";
import { $canvasWidth } from "~/builder/shared/nano-states";
import { CanvasSettingsPopover } from "./canvas-settings-popover";

export default { title: "Canvas settings", component: CanvasSettingsPopover };
export const CanvasSettings = () => {
  useEffect(() => {
    const previous = [
      $breakpoints.get(),
      $selectedBreakpointId.get(),
      $canvasWidth.get(),
    ] as const;
    $breakpoints.set(new Map([["base", { id: "base", label: "" }]]));
    $selectedBreakpointId.set("base");
    $canvasWidth.set(1280);
    return () => {
      $breakpoints.set(previous[0]);
      $selectedBreakpointId.set(previous[1]);
      $canvasWidth.set(previous[2]);
    };
  }, []);
  return <CanvasSettingsPopover />;
};
