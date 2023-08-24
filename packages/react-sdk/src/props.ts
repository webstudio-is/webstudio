import { useContext, useMemo } from "react";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import type { Instance, Page, Prop, Props } from "@webstudio-is/project-build";
import type { Asset, Assets } from "@webstudio-is/asset-uploader";
import { ReactSdkContext } from "./context";
import { idAttribute, indexAttribute } from "./tree/webstudio-component";

export type PropsByInstanceId = Map<Instance["id"], Prop[]>;

export type Pages = Map<Page["id"], Page>;

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
  const {
    propsByInstanceIdStore,
    dataSourceValuesStore,
    executeEffectfulExpression,
    setDataSourceValues,
    renderer,
    indexesWithinAncestors,
  } = useContext(ReactSdkContext);
  const index = indexesWithinAncestors.get(instanceId);
  const instancePropsObjectStore = useMemo(() => {
    return computed(
      [propsByInstanceIdStore, dataSourceValuesStore],
      (propsByInstanceId, dataSourceValues) => {
        const instancePropsObject: Record<Prop["name"], unknown> = {};
        if (index !== undefined) {
          instancePropsObject[indexAttribute] = index.toString();
        }
        const instanceProps = propsByInstanceId.get(instanceId);
        if (instanceProps === undefined) {
          return instancePropsObject;
        }
        for (const prop of instanceProps) {
          if (prop.type === "asset" || prop.type === "page") {
            continue;
          }
          if (prop.type === "dataSource") {
            const dataSourceId = prop.value;
            const value = dataSourceValues.get(dataSourceId);
            if (value !== undefined) {
              instancePropsObject[prop.name] = value;
            }
            continue;
          }
          if (prop.type === "action") {
            instancePropsObject[prop.name] = (...args: unknown[]) => {
              // prevent all actions in canvas mode
              if (renderer === "canvas") {
                return;
              }
              for (const value of prop.value) {
                if (value.type === "execute") {
                  const argsMap = new Map<string, unknown>();
                  for (const [i, name] of value.args.entries()) {
                    argsMap.set(name, args[i]);
                  }
                  const newValues = executeEffectfulExpression(
                    value.code,
                    argsMap,
                    dataSourceValues
                  );
                  setDataSourceValues(newValues);
                }
              }
            };
            continue;
          }
          instancePropsObject[prop.name] = prop.value;
        }
        return instancePropsObject;
      }
    );
  }, [
    propsByInstanceIdStore,
    dataSourceValuesStore,
    instanceId,
    renderer,
    executeEffectfulExpression,
    setDataSourceValues,
    index,
  ]);
  const instancePropsObject = useStore(instancePropsObjectStore);
  return instancePropsObject;
};

// this utility is used for image component in both builder and preview
// so need to optimize rerenders with computed
export const usePropAsset = (instanceId: Instance["id"], name: string) => {
  const { propsByInstanceIdStore, assetsStore } = useContext(ReactSdkContext);
  const assetStore = useMemo(() => {
    return computed(
      [propsByInstanceIdStore, assetsStore],
      (propsByInstanceId, assets) => {
        const instanceProps = propsByInstanceId.get(instanceId);
        if (instanceProps === undefined) {
          return;
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

export const resolveUrlProp = (
  instanceId: Instance["id"],
  name: string,
  {
    props,
    pages,
    assets,
  }: { props: PropsByInstanceId; pages: Pages; assets: Assets }
):
  | {
      type: "page";
      page: Page;
      instanceId?: Instance["id"];
      hash?: string;
    }
  | { type: "asset"; asset: Asset }
  | { type: "string"; url: string }
  | undefined => {
  const instanceProps = props.get(instanceId);
  if (instanceProps === undefined) {
    return;
  }

  let prop = undefined;

  // We had a bug that some props were duplicated https://github.com/webstudio-is/webstudio-builder/pull/2170
  // Use the latest prop to ensure consistency with the builder settings panel.
  for (const intanceProp of instanceProps) {
    if (intanceProp.name !== name) {
      continue;
    }
    prop = intanceProp;
  }

  if (prop === undefined) {
    return;
  }

  if (prop.type === "page") {
    if (typeof prop.value === "string") {
      const page = pages.get(prop.value);
      return page && { type: "page", page };
    }

    const { instanceId, pageId } = prop.value;

    const page = pages.get(pageId);

    if (page === undefined) {
      return;
    }

    const idProp = props.get(instanceId)?.find((prop) => prop.name === "id");

    return {
      type: "page",
      page,
      instanceId,
      hash:
        idProp === undefined || idProp.type !== "string"
          ? undefined
          : idProp.value,
    };
  }

  if (prop.type === "string") {
    for (const page of pages.values()) {
      if (page.path === prop.value) {
        return { type: "page", page };
      }
    }
    return { type: "string", url: prop.value };
  }

  if (prop.type === "asset") {
    const asset = assets.get(prop.value);
    return asset && { type: "asset", asset };
  }

  return;
};

// this utility is used for link component in both builder and preview
// so need to optimize rerenders with computed
export const usePropUrl = (instanceId: Instance["id"], name: string) => {
  const { propsByInstanceIdStore, pagesStore, assetsStore } =
    useContext(ReactSdkContext);
  const store = useMemo(
    () =>
      computed(
        [propsByInstanceIdStore, pagesStore, assetsStore],
        (props, pages, assets) =>
          resolveUrlProp(instanceId, name, { props, pages, assets })
      ),
    [propsByInstanceIdStore, pagesStore, assetsStore, instanceId, name]
  );
  return useStore(store);
};

export const getInstanceIdFromComponentProps = (
  props: Record<string, unknown>
) => {
  return props[idAttribute] as string;
};

export const getIndexWithinAncestorFromComponentProps = (
  props: Record<string, unknown>
) => {
  return props[indexAttribute] as string | undefined;
};
