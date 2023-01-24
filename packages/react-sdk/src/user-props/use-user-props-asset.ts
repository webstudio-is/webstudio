import { useMemo } from "react";
import { PropsItem, type Instance } from "../db";
import { useAllUserProps } from "./all-user-props";
import type { Asset } from "@webstudio-is/asset-uploader";

/**
 * Get asset for prop, like src on the Image component
 */
export const useUserPropsAsset = (
  instanceId: Instance["id"],
  propName: PropsItem["name"]
): Asset | undefined => {
  const allUserProps = useAllUserProps();

  const propsData = allUserProps[instanceId];
  const asset = useMemo(() => {
    if (propsData == null) {
      return undefined;
    }
    const prop = propsData.find((prop) => prop.name === propName);

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
