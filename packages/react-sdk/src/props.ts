import { useContext, useMemo } from "react";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import type { Instance, Page, Prop, Props, Assets } from "@webstudio-is/sdk";
import { ReactSdkContext } from "./context";
import { idAttribute, indexAttribute } from "./tree/webstudio-component";

export type PropsByInstanceId = Map<Instance["id"], Prop[]>;

export type Pages = Map<Page["id"], Page>;

export const normalizeProps = ({
  props,
  assetBaseUrl,
  assets,
}: {
  props: Prop[];
  assetBaseUrl: string;
  assets: Assets;
}) => {
  const newProps: Prop[] = [];
  for (const prop of props) {
    if (prop.type === "asset") {
      const assetId = prop.value;
      const asset = assets.get(assetId);
      if (asset === undefined) {
        continue;
      }
      newProps.push({
        id: prop.id,
        name: prop.name,
        required: prop.required,
        instanceId: prop.instanceId,
        type: "string",
        value: `${assetBaseUrl}${asset.name}`,
      });
      continue;
    }
    newProps.push(prop);
  }
  return newProps;
};

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
    dataSourcesLogicStore,
    assetBaseUrl,
    assetsStore,
    indexesWithinAncestors,
  } = useContext(ReactSdkContext);
  const index = indexesWithinAncestors.get(instanceId);
  const instancePropsObjectStore = useMemo(() => {
    return computed(
      [propsByInstanceIdStore, dataSourcesLogicStore, assetsStore],
      (propsByInstanceId, dataSourcesLogic, assets) => {
        const instancePropsObject: Record<Prop["name"], unknown> = {};
        if (index !== undefined) {
          instancePropsObject[indexAttribute] = index.toString();
        }
        const instanceProps = propsByInstanceId.get(instanceId);
        if (instanceProps === undefined) {
          return instancePropsObject;
        }
        const normalizedProps = normalizeProps({
          props: instanceProps,
          assetBaseUrl,
          assets,
        });
        for (const prop of normalizedProps) {
          // asset is normalized to string
          // page is handled internally
          if (prop.type === "asset" || prop.type === "page") {
            continue;
          }
          if (prop.type === "dataSource") {
            const dataSourceId = prop.value;
            const value = dataSourcesLogic.get(dataSourceId);
            if (value !== undefined) {
              instancePropsObject[prop.name] = value;
            }
            continue;
          }
          if (prop.type === "action") {
            const action = dataSourcesLogic.get(prop.id);
            if (typeof action === "function") {
              instancePropsObject[prop.name] = action;
            }
            continue;
          }
          instancePropsObject[prop.name] = prop.value;
        }
        return instancePropsObject;
      }
    );
  }, [
    propsByInstanceIdStore,
    assetsStore,
    dataSourcesLogicStore,
    instanceId,
    index,
    assetBaseUrl,
  ]);
  const instancePropsObject = useStore(instancePropsObjectStore);
  return instancePropsObject;
};

export const resolveUrlProp = (
  instanceId: Instance["id"],
  name: string,
  {
    assetBaseUrl,
    props,
    pages,
    assets,
  }: {
    assetBaseUrl: string;
    props: PropsByInstanceId;
    pages: Pages;
    assets: Assets;
  }
):
  | {
      type: "page";
      page: Page;
      instanceId?: Instance["id"];
      hash?: string;
    }
  | { type: "string"; url: string }
  | undefined => {
  const instanceProps = props.get(instanceId);
  if (instanceProps === undefined) {
    return;
  }

  let prop = undefined;

  const normalizedProps = normalizeProps({
    props: instanceProps,
    assetBaseUrl,
    assets,
  });

  // We had a bug that some props were duplicated https://github.com/webstudio-is/webstudio/pull/2170
  // Use the latest prop to ensure consistency with the builder settings panel.
  for (const instanceProp of normalizedProps) {
    if (instanceProp.name !== name) {
      continue;
    }
    prop = instanceProp;
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

  return;
};

// this utility is used for link component in both builder and preview
// so need to optimize rerenders with computed
export const usePropUrl = (instanceId: Instance["id"], name: string) => {
  const { assetBaseUrl, propsByInstanceIdStore, pagesStore, assetsStore } =
    useContext(ReactSdkContext);
  const store = useMemo(
    () =>
      computed(
        [propsByInstanceIdStore, pagesStore, assetsStore],
        (props, pages, assets) =>
          resolveUrlProp(instanceId, name, {
            assetBaseUrl,
            props,
            pages,
            assets,
          })
      ),
    [
      propsByInstanceIdStore,
      pagesStore,
      assetsStore,
      instanceId,
      name,
      assetBaseUrl,
    ]
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
