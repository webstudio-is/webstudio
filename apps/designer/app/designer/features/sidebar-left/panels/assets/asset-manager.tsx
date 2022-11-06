import { ImageManager } from "~/designer/shared/image-manager";
import { FontsManager } from "~/designer/shared/fonts-manager";
import type { AssetType } from "@webstudio-is/asset-uploader";
import { useState } from "react";

export const AssetManager = () => {
  const [type, setType] = useState<AssetType>("image");
  if (type === "image") {
    return <ImageManager onChangeType={setType} />;
  }
  if (type === "font") {
    return <FontsManager onChangeType={setType} />;
  }

  return null;
};
