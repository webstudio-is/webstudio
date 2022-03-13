import { useEffect } from "react";
import { type SelectedInstanceData } from "~/shared/component";
import {
  getBrowserStyle,
  type Instance,
  useAllUserProps,
} from "@webstudio-is/sdk";
import { useSelectedInstance, useSelectedElement } from "../nano-values";
import { publish } from "../pubsub";

export const usePublishSelectedInstance = () => {
  const [instance] = useSelectedInstance();
  const [selectedElement] = useSelectedElement();
  const [allUserProps] = useAllUserProps();
  useEffect(() => {
    publish<"selectInstance", SelectedInstanceData>({
      type: "selectInstance",
      payload: instance
        ? {
            id: instance.id,
            component: instance.component,
            style: instance.style,
            browserStyle: getBrowserStyle(selectedElement),
            props: allUserProps.get(instance.id) || [],
          }
        : undefined, // Unselects the instance
    });
  }, [instance, selectedElement]);
};

export const usePublishRootInstance = (instance: Instance) => {
  useEffect(() => {
    publish<"loadRootInstance", Instance>({
      type: "loadRootInstance",
      payload: instance,
    });
  }, [instance]);
};
