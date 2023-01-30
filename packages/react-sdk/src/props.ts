import { useMemo } from "react";
import { atom, computed, type ReadableAtom } from "nanostores";
import { useStore } from "@nanostores/react";
import type { Instance, Props } from "@webstudio-is/project-build";
import type { Asset } from "@webstudio-is/asset-uploader";

type PropsByInstanceId = Map<Instance["id"], Props>;

type PropsByInstanceIdStore = ReadableAtom<PropsByInstanceId>;

let propsByInstanceIdStore: PropsByInstanceIdStore = atom(new Map());

export const setPropsByInstanceIdStore = (store: PropsByInstanceIdStore) => {
  propsByInstanceIdStore = store;
};

export const getPropsByInstanceIdStore = () => {
  return propsByInstanceIdStore;
};

export const getPropsByInstanceId = (props: Props) => {
  const propsByInstanceId: PropsByInstanceId = new Map();
  for (const prop of props) {
    let instanceProps = propsByInstanceId.get(prop.instanceId);
    if (instanceProps === undefined) {
      instanceProps = [];
      propsByInstanceId.set(prop.instanceId, instanceProps);
    }
    instanceProps.push(prop);
  }
  return propsByInstanceId;
};

// this utility is be used only for preview with static props
// so there is no need to use computed to optimize rerenders
export const useInstanceProps = (instanceId: Instance["id"]) => {
  const propsByInstanceId = useStore(propsByInstanceIdStore);
  const instanceProps = propsByInstanceId.get(instanceId);
  const instancePropsObject: Record<string, number | string | boolean> = {};
  if (instanceProps) {
    for (const prop of instanceProps) {
      if (prop.type !== "asset") {
        instancePropsObject[prop.name] = prop.value;
      }
    }
  }
  return instancePropsObject;
};

// this utility is be used for image component in both designer and preview
// so need to optimize rerenders with computed
export const usePropAsset = (instanceId: Instance["id"], name: string) => {
  const assetStore = useMemo(() => {
    return computed(propsByInstanceIdStore, (propsByInstanceId) => {
      const instanceProps = propsByInstanceId.get(instanceId);
      let asset: undefined | Asset = undefined;
      if (instanceProps) {
        for (const prop of instanceProps) {
          if (prop.type === "asset" && prop.name === name) {
            asset = prop.value;
          }
        }
      }
      return asset;
    });
  }, [instanceId, name]);
  const asset = useStore(assetStore);
  return asset;
};
