import { useMemo } from "react";
import { type Instance } from "../db";
import { type UserProp } from "./schema";
import { useAllUserProps } from "./all-user-props";
import type { Asset } from "@webstudio-is/asset-uploader";

/**
 * Get asset for prop, like src on the Image component
 */
export const useUserPropsAsset = (
  instanceId: Instance["id"],
  propName: UserProp["prop"]
): Asset | undefined => {
  const allUserProps = useAllUserProps();

  const propsData = allUserProps[instanceId];
  const asset = useMemo(() => {
    if (propsData == null) {
      return undefined;
    }
    const prop = propsData.props.find((prop) => prop.prop === propName);

    if (prop == null) {
      return undefined;
    }

    if (prop.type === "asset") {
      return prop.value;
    }

    return undefined;
  }, [propName, propsData]);

  return asset;
};
