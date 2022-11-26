import { useMemo } from "react";
import { type Instance } from "../db";
import { type UserProp } from "./schema";
import { useAllUserProps } from "./all-user-props";
import type { Asset } from "@webstudio-is/asset-uploader";

/**
 * User props mapped in prop:value format,
 * up to date with props panel.
 */
export const useUserPropsAsset = (
  instanceId: Instance["id"],
  propName: UserProp["prop"]
): Asset | null => {
  const [allUserProps] = useAllUserProps();

  const propsData = allUserProps[instanceId];
  const asset = useMemo(() => {
    if (propsData == null) return null;
    const prop = propsData.props.find((prop) => prop.prop === propName);
    if (prop == null) return null;

    return prop.asset ?? null;
  }, [propName, propsData]);

  return asset;
};
