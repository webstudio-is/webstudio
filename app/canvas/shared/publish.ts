import { useEffect } from "react";
import ObjectId from "bson-objectid";
import {
  getBrowserStyle,
  useAllUserProps,
  type Instance,
  type Tree,
  type Breakpoint,
} from "@webstudio-is/sdk";
import { type SelectedInstanceData } from "~/shared/component";
import {
  useSelectedInstance,
  useSelectedElement,
  useRootInstance,
  useBreakpoints,
} from "./nano-values";
import { publish } from "./pubsub";

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
        cssRules: instance.cssRules,
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

export const usePublishRootInstance = () => {
  const [rootInstance] = useRootInstance();
  useEffect(() => {
    publish<"loadRootInstance", Instance>({
      type: "loadRootInstance",
      payload: rootInstance,
    });
  }, [rootInstance]);
};

export const usePublishBreakpoints = () => {
  const [breakpoints] = useBreakpoints();
  useEffect(() => {
    publish<"loadBreakpoints", Array<Breakpoint>>({
      type: "loadBreakpoints",
      payload: breakpoints,
    });
  }, [breakpoints]);
};
