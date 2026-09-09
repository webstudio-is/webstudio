import type { Meta, StoryObj } from "@storybook/react";
import { Grid } from "@webstudio-is/design-system";
import {
  createDefaultCollectionConfig,
  parseCollectionConfig,
} from "@webstudio-is/content-engine";
import type { Asset } from "@webstudio-is/sdk";
import { FolderThumbnail } from "./asset-folder-thumbnail";
import type { ContentCollection } from "../assets/content-collections";

const configAsset: Asset = {
  id: "config",
  projectId: "project",
  name: "collection.json",
  filename: "collection",
  format: "json",
  type: "file",
  size: 1,
  createdAt: "2026-09-07T00:00:00.000Z",
  meta: {},
};
const collection: ContentCollection = {
  status: "ready",
  folderId: "posts",
  configAsset,
  templateAsset: {
    ...configAsset,
    id: "template",
    name: "template.mdx",
    filename: "template",
    format: "mdx",
  },
  config: parseCollectionConfig(createDefaultCollectionConfig()),
  templateProperties: {},
};
const invalidCollection: ContentCollection = {
  status: "invalid",
  folderId: "invalid",
  configAsset,
  reservedAssets: [configAsset],
  siblingAssets: [configAsset],
  repairAsset: configAsset,
  message: "Invalid collection configuration",
};

export default {
  title: "Asset Manager/Folder thumbnails",
  component: FolderThumbnail,
} satisfies Meta<typeof FolderThumbnail>;

export const Default: StoryObj = {
  render: () => (
    <Grid gap={3} css={{ width: 280, gridTemplateColumns: "repeat(3, 1fr)" }}>
      {[false, true].flatMap((selected) =>
        [undefined, collection, invalidCollection].map((collection, index) => {
          const name = ["Folder", "Collection", "Invalid"][index];
          return (
            <FolderThumbnail
              key={`${selected}-${name}`}
              folder={{
                id: `${selected}-${name}`,
                projectId: "project",
                name,
                createdAt: "2026-09-07T00:00:00.000Z",
              }}
              collection={collection}
              selected={selected}
              canManage
              onOpen={() => undefined}
              canMoveItems={() => false}
              onMoveItems={() => undefined}
              interactions={{
                onSelectionChange: () => undefined,
                onItemPointerDown: () => undefined,
                onItemClick: () => undefined,
                onModifiedArrow: () => undefined,
                onContextMenuSelection: () => undefined,
                onContextMenuActions: () => undefined,
                getDragItems: (item) => [item],
              }}
            />
          );
        })
      )}
    </Grid>
  ),
};
