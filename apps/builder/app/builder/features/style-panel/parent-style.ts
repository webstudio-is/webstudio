import { useStore } from "@nanostores/react";
import { useStyleInfoByInstanceId } from "./shared/style-info";
import {
  $instances,
  $registeredComponentMetas,
  $selectedInstanceSelector,
} from "~/shared/nano-states";

/**
 * Gets styleable parent style
 **/
export const useParentStyle = () => {
  const selectedInstanceSelector = useStore($selectedInstanceSelector);
  const instances = useStore($instances);
  const registeredComponentMetas = useStore($registeredComponentMetas);

  let parentInstanceSelector: string[] | undefined = undefined;
  for (let i = 1; i < (selectedInstanceSelector?.length ?? 0); ++i) {
    parentInstanceSelector = selectedInstanceSelector!.slice(i);
    const component = instances.get(parentInstanceSelector[0])?.component;
    const meta = component
      ? registeredComponentMetas.get(component)
      : undefined;
    // ignore instances without meta and unstylable components
    if (meta !== undefined && meta.stylable !== false) {
      break;
    }
  }

  const parentStyleInfo = useStyleInfoByInstanceId(parentInstanceSelector);
  return parentStyleInfo;
};
