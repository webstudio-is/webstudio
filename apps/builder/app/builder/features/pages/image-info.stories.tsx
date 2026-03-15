import { Flex, Text } from "@webstudio-is/design-system";
import { ImageInfo } from "./image-info";
import type { ImageAsset } from "@webstudio-is/sdk";

export default {
  title: "Builder/Pages/Image Info",
  component: ImageInfo,
};

const mockAsset: ImageAsset = {
  id: "asset-1",
  projectId: "project-1",
  size: 204800,
  name: "hero-banner.jpg",
  filename: "hero-banner.jpg",
  description: "Hero banner image",
  createdAt: "2025-01-01T00:00:00.000Z",
  format: "jpeg",
  meta: { width: 1920, height: 1080 },
  type: "image",
};

const squareAsset: ImageAsset = {
  id: "asset-2",
  projectId: "project-1",
  size: 102400,
  name: "avatar.png",
  filename: "avatar.png",
  description: "User avatar",
  createdAt: "2025-06-15T00:00:00.000Z",
  format: "png",
  meta: { width: 400, height: 400 },
  type: "image",
};

export const ImageInfo = () => (
  <Flex direction="column" gap="5" css={{ width: 400 }}>
    <Text variant="labels">Landscape image</Text>
    <ImageInfo asset={mockAsset} onDelete={() => {}} />

    <Text variant="labels">Square image</Text>
    <ImageInfo asset={squareAsset} onDelete={() => {}} />
  </Flex>
);
