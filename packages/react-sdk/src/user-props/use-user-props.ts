import { useEffect, useMemo, useState } from "react";
import { type Instance } from "../db";
import { type UserProp } from "./types";
import { useAllUserProps } from "./all-user-props";

type UserProps = { [prop: UserProp["prop"]]: UserProp["value"] };

/**
 * User props mapped in prop:value format,
 * up to date with props panel.
 */
export const useUserProps = (instanceId: Instance["id"]) => {
  const [allUserProps] = useAllUserProps();
  const propsData = allUserProps[instanceId];
  const initialUserProps = useMemo(() => {
    if (propsData === undefined) return {};
    return propsData.props.reduce((props, { prop, value }) => {
      props[prop] = value;
      return props;
    }, {} as UserProps);
  }, [propsData]);

  const [props, setProps] = useState<UserProps>(initialUserProps);

  useEffect(() => {
    if (propsData == undefined) return;
    const nextProps: UserProps = {};
    for (const prop of propsData.props) {
      nextProps[prop.prop] = prop.value;
    }
    setProps(nextProps);
  }, [propsData]);

  return props;
};
