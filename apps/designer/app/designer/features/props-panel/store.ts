import { v4 as uuid } from "uuid";
import store from "immerhin";
import { createValueContainer, useValue } from "react-nano-state";
import type {
  Instance,
  InstanceProps,
  UserProp,
} from "@webstudio-is/react-sdk";
import { useState } from "react";
import {
  deletePropMutable,
  updateAllUserPropsMutable,
} from "~/shared/props-utils";

export type TreeProps = {
  [instanceId: Instance["id"]]: InstanceProps;
};

export const treePropsStore = createValueContainer<TreeProps>({});

export const useTreeProps = () => {
  return useValue(treePropsStore);
};

const createInstanceProps = (
  treeId: string,
  instanceId: string
): InstanceProps => {
  return {
    treeId,
    instanceId,
    id: uuid(),
    props: [],
  };
};

export const getInstanceProps = (
  treeId: string,
  instanceId: string,
  treeProps: TreeProps
): InstanceProps => {
  return treeProps[instanceId] ?? createInstanceProps(treeId, instanceId);
};

export const useSetTreeProps = (treeProps: InstanceProps[]) => {
  useState(() => {
    const propsMap: TreeProps = {};
    for (const props of treeProps) {
      propsMap[props.instanceId] = props;
    }
    //We don't need to trigger rerender when setting the initial value
    treePropsStore.value = propsMap;
  });
};

export const updateProps = (
  treeId: string,
  instanceId: string,
  propsId: string,
  updates: Array<UserProp>
) => {
  store.createTransaction([treePropsStore], (treeProps) => {
    updateAllUserPropsMutable(treeId, treeProps, {
      instanceId,
      propsId,
      updates,
    });
  });
};

export const deleteProp = (instanceId: string, propId: string) => {
  store.createTransaction([treePropsStore], (treeProps) => {
    deletePropMutable(treeProps, {
      instanceId,
      propId: propId,
    });
  });
};
