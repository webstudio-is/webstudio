import { useContext, useMemo } from "react";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import type { Instance, Prop, Props } from "@webstudio-is/project-build";
import type { Asset } from "@webstudio-is/asset-uploader";
import { ReactSdkContext } from "./context";

export type PropsByInstanceId = Map<Instance["id"], Prop[]>;

export type Assets = Map<Asset["id"], Asset>;

export const getPropsByInstanceId = (props: Props) => {
  const propsByInstanceId: PropsByInstanceId = new Map();
  for (const prop of props.values()) {
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
  const { propsByInstanceIdStore } = useContext(ReactSdkContext);
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

// this utility is be used for image component in both builder and preview
// so need to optimize rerenders with computed
export const usePropAsset = (instanceId: Instance["id"], name: string) => {
  const { propsByInstanceIdStore, assetsStore } = useContext(ReactSdkContext);
  const assetStore = useMemo(() => {
    return computed(
      [propsByInstanceIdStore, assetsStore],
      (propsByInstanceId, assets) => {
        const instanceProps = propsByInstanceId.get(instanceId);
        if (instanceProps === undefined) {
          return undefined;
        }
        for (const prop of instanceProps) {
          if (prop.type === "asset" && prop.name === name) {
            const assetId = prop.value;
            return assets.get(assetId);
          }
        }
      }
    );
  }, [propsByInstanceIdStore, assetsStore, instanceId, name]);
  const asset = useStore(assetStore);
  return asset;
};
