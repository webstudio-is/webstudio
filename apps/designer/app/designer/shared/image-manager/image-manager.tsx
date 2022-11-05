import { Grid } from "@webstudio-is/design-system";
import type { Asset } from "@webstudio-is/asset-uploader";
import { ImageThumbnail } from "./image-thumbnail";
import { AssetsShell, useAssets } from "../assets";

type ImageManagerProps = {
  onSelect?: (asset: Asset) => void;
};

export const ImageManager = ({ onSelect }: ImageManagerProps) => {
  const { assets, handleDelete } = useAssets("image");
  return (
    <AssetsShell searchProps={{}} isEmpty={assets.length === 0} type="image">
      <Grid columns={2} gap={2}>
        {assets.map((asset) => (
          <ImageThumbnail
            key={asset.id}
            asset={asset}
            onDelete={handleDelete}
            onSelect={onSelect}
          />
        ))}
      </Grid>
    </AssetsShell>
  );
};
