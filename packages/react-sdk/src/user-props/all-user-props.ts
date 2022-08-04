import { useRef } from "react";
import { createValueContainer, useValue } from "react-nano-state";
import type { InstanceProps, Instance } from "../db";

export type AllUserProps = { [id: Instance["id"]]: InstanceProps };

export const allUserPropsContainer = createValueContainer<AllUserProps>({});

export const useAllUserProps = (initialUserProps?: Array<InstanceProps>) => {
  // @todo ssr workaround for https://github.com/webstudio-is/webstudio-designer/issues/213
  const ref = useRef(false);
  if (ref.current === false && initialUserProps !== undefined) {
    const propsMap: AllUserProps = {};
    for (const props of initialUserProps) {
      propsMap[props.instanceId] = props;
    }
    //We don't need to trigger rerender when setting the initial value
    allUserPropsContainer.value = propsMap;
    ref.current = true;
  }
  return useValue(allUserPropsContainer);
};
