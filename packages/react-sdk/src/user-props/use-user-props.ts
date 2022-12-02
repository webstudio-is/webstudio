import { useMemo } from "react";
import { type Instance } from "../db";
import { type UserProp } from "./schema";
import { useAllUserProps } from "./all-user-props";

type UserProps = { [prop: UserProp["prop"]]: UserProp["value"] };

/**
 * User props mapped in prop:value format,
 * up to date with props panel.
 */
export const useUserProps = (instanceId: Instance["id"]) => {
  const [allUserProps] = useAllUserProps();

  const propsData = allUserProps[instanceId];
  const props = useMemo(() => {
    if (propsData == null) return {};
    return propsData.props.reduce((props, { prop, value }) => {
      props[prop] = value;
      return props;
    }, {} as UserProps);
  }, [propsData]);

  return props;
};
