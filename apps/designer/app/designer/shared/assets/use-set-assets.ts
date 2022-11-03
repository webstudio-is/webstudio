import type { Asset } from "@webstudio-is/asset-uploader";
import { useEffect } from "react";
import { Publish } from "~/shared/pubsub";
import { useAssets } from "../nano-states";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    updateAssets: Array<Asset>;
  }
}

type UseSetAssets = {
  assets?: Array<Asset>;
  publish: Publish;
};

export const useSetAssets = ({ assets, publish }: UseSetAssets) => {
  const [, setAssets] = useAssets();
  useEffect(() => {
    if (assets) {
      setAssets(assets);
      publish({ type: "updateAssets", payload: assets });
    }
  }, [assets, setAssets, publish]);
};
