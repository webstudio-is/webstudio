import type {
  Props,
  Instances,
  WebstudioFragment,
  WsComponentMeta,
} from "@webstudio-is/sdk";
import type { InstanceSelector } from "./tree-utils";
import { isTreeSatisfyingContentModel } from "./content-model";

export const findClosestInstanceMatchingFragment = ({
  instances,
  props,
  metas,
  instanceSelector,
  fragment,
  onError,
}: {
  instances: Instances;
  props: Props;
  metas: Map<string, WsComponentMeta>;
  instanceSelector: InstanceSelector;
  // require only subset of fragment
  fragment: Pick<WebstudioFragment, "children" | "instances" | "props">;
  onError?: (message: string) => void;
}) => {
  const mergedInstances = new Map(instances);
  for (const instance of fragment.instances) {
    mergedInstances.set(instance.id, instance);
  }
  const mergedProps = new Map(props);
  for (const prop of fragment.props) {
    mergedProps.set(prop.id, prop);
  }
  let firstError = "";
  for (let index = 0; index < instanceSelector.length; index += 1) {
    const instanceId = instanceSelector[index];
    const instance = instances.get(instanceId);
    // collection item can be undefined
    if (instance === undefined) {
      continue;
    }
    const meta = metas.get(instance.component);
    if (meta === undefined) {
      continue;
    }
    let matches = true;
    for (const child of fragment.children) {
      if (child.type === "id") {
        const childInstanceSelector = [
          child.value,
          ...instanceSelector.slice(index),
        ];
        matches &&= isTreeSatisfyingContentModel({
          instances: mergedInstances,
          props: mergedProps,
          metas,
          instanceSelector: childInstanceSelector,
          onError: (message) => {
            if (firstError === "") {
              firstError = message;
            }
          },
        });
      }
    }
    if (matches) {
      return index;
    }
  }
  onError?.(firstError);
  return -1;
};
