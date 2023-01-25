import { useMemo } from "react";
import type { Instance, PropsItem } from "../db";
import { useAllUserProps } from "./all-user-props";

type UserProps = { [name: PropsItem["name"]]: string | number | boolean };

/**
 * User props mapped in prop:value format,
 * up to date with props panel.
 */
export const useUserProps = (instanceId: Instance["id"]) => {
  const allUserProps = useAllUserProps();

  const propsData = allUserProps[instanceId];
  const props = useMemo(() => {
    if (propsData == null) {
      return {};
    }
    const result: UserProps = {};

    for (const userProp of propsData) {
      if (userProp.type !== "asset") {
        result[userProp.name] = userProp.value;
      }
    }

    return result;
  }, [propsData]);

  return props;
};
