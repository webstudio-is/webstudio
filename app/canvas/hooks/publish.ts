import { useEffect } from "react";
import { type SelectedInstanceData } from "~/shared/component";
import {
  getBrowserStyle,
  useAllUserProps,
  type Instance,
  type Tree,
} from "@webstudio-is/sdk";
import { useSelectedInstance, useSelectedElement } from "../nano-values";
import { publish } from "../pubsub";
import ObjectId from "bson-objectid";

export const usePublishSelectedInstance = ({
  treeId,
}: {
  treeId: Tree["id"];
}) => {
  const [instance] = useSelectedInstance();
  const [selectedElement] = useSelectedElement();
  const [allUserProps] = useAllUserProps();
  useEffect(() => {
    // Unselects the instance by `undefined`
    let payload;
    if (instance !== undefined) {
      let props = allUserProps[instance.id];
      if (props === undefined) {
        props = {
          id: ObjectId().toString(),
          instanceId: instance.id,
          treeId,
          props: [],
        };
      }
      payload = {
        id: instance.id,
        component: instance.component,
        style: instance.style,
        browserStyle: getBrowserStyle(selectedElement),
        props,
      };
    }

    publish<"selectInstance", SelectedInstanceData>({
      type: "selectInstance",
      payload,
    });
  }, [instance, selectedElement, allUserProps, treeId]);
};

export const usePublishRootInstance = (instance: Instance) => {
  useEffect(() => {
    publish<"loadRootInstance", Instance>({
      type: "loadRootInstance",
      payload: instance,
    });
  }, [instance]);
};
