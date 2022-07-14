import { useMemo } from "react";
import { createValueContainer, useValue } from "react-nano-state";
import type { InstanceProps, Instance } from "../db";

export type AllUserProps = { [id: Instance["id"]]: InstanceProps };

export const allUserPropsContainer = createValueContainer<AllUserProps>({});

export const useAllUserProps = (initialUserProps?: Array<InstanceProps>) => {
  useMemo(() => {
    if (initialUserProps === undefined) return;
    const propsMap: AllUserProps = {};
    for (const props of initialUserProps) {
      propsMap[props.instanceId] = props;
    }
    //We don't need to trigger rerender when setting the initial value
    allUserPropsContainer.value = propsMap;
  }, []);
  return useValue(allUserPropsContainer);
};
