import { idAttribute } from "@webstudio-is/react-sdk";
import type { Instances } from "@webstudio-is/sdk";
import { $instances } from "~/shared/nano-states";

/**
 * When a new instance is added to the canvas, scroll it into view.
 */
export const subscribeScrollNewInstanceIntoView = (
  debounceEffect: (callback: () => void) => void,
  previousInstances: { current?: Instances }
) => {
  return $instances.subscribe((instances) => {
    if (previousInstances.current === undefined) {
      previousInstances.current = instances;
      return;
    }
    let newInstanceId: string | undefined;
    for (const [id] of instances) {
      if (previousInstances.current.has(id)) {
        continue;
      }
      newInstanceId = id;
      break;
    }
    if (newInstanceId === undefined) {
      return;
    }
    previousInstances.current = instances;
    debounceEffect(() => {
      const element = document.querySelector(
        `[${idAttribute}="${newInstanceId}"]`
      );
      element?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  });
};
