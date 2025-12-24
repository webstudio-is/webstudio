import type { Meta, StoryObj } from "@storybook/react";
import { AssetManager } from "./asset-manager";
import {
  ALLOWED_FILE_TYPES,
  IMAGE_EXTENSIONS,
  VIDEO_EXTENSIONS,
} from "@webstudio-is/sdk";
import type { Asset, AllowedFileExtension } from "@webstudio-is/sdk";
import { $assets } from "~/shared/nano-states";
import { useEffect } from "react";

// Create mock assets for every file type
const createMockAssets = (): Asset[] => {
  const extensions = Object.keys(ALLOWED_FILE_TYPES).filter(
    (ext) =>
      !IMAGE_EXTENSIONS.includes(ext as AllowedFileExtension) &&
      !VIDEO_EXTENSIONS.includes(ext as AllowedFileExtension)
  );
  const assets: Asset[] = [];

  extensions.forEach((ext, index) => {
    assets.push({
      id: `asset-${index}`,
      name: `example-file.${ext}`,
      type: "file" as const, // Use "file" type to show icons instead of trying to load images
      format: ext,
      size: 1024 * (index + 1),
      meta: { width: 0, height: 0 },
      createdAt: new Date().toISOString(),
      projectId: "mock-project",
      description: `Example ${ext.toUpperCase()} file`,
    });
  });

  return assets;
};

export default {
  title: "Asset Manager",
  component: AssetManager,
} satisfies Meta;

const AssetManagerStory = () => {
  useEffect(() => {
    const assets = createMockAssets();
    $assets.set(new Map(assets.map((asset) => [asset.id, asset])));
  }, []);

  return (
    <div style={{ width: 400, display: "flex" }}>
      <AssetManager />
    </div>
  );
};

export const AllFileTypes: StoryObj = {
  render: () => <AssetManagerStory />,
};
