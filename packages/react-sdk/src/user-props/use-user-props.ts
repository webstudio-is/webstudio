import { useMemo } from "react";
import { type Instance } from "../db";
import { type UserProp } from "./schema";
import { useAllUserProps } from "./all-user-props";

type UserPropValue = Extract<UserProp, { value: unknown }>;
type UserProps = { [prop: UserProp["prop"]]: UserPropValue["value"] };

/**
 * User props mapped in prop:value format,
 * up to date with props panel.
 */
export const useUserProps = (instanceId: Instance["id"]) => {
  const [allUserProps] = useAllUserProps();

  const propsData = allUserProps[instanceId];
  const props = useMemo(() => {
    if (propsData == null) return {};
    const result: UserProps = {};

    for (const userProp of propsData.props) {
      if ("value" in userProp) {
        result[userProp.prop] = userProp.value;
      }
    }

    return result;
  }, [propsData]);

  return props;
};
