import { useRef } from "react";
import { atom } from "nanostores";
import { useStore } from "@nanostores/react";
import type { InstanceProps, Instance } from "../db";
import { UserProp } from "./schema";

export type AllUserProps = {
  [id: Instance["id"]]: UserProp[];
};

export const allUserPropsContainer = atom<AllUserProps>({});

export const useAllUserProps = (initialUserProps?: Array<InstanceProps>) => {
  // @todo ssr workaround for https://github.com/webstudio-is/webstudio-designer/issues/213
  const ref = useRef(false);
  if (ref.current === false && initialUserProps !== undefined) {
    const propsMap: AllUserProps = {};
    for (const item of initialUserProps) {
      propsMap[item.instanceId] = item.props;
    }
    //We don't need to trigger rerender when setting the initial value
    allUserPropsContainer.set(propsMap);
    ref.current = true;
  }
  return useStore(allUserPropsContainer);
};
