import { useLayoutEffect, useState, type ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  createDefaultCollectionConfig,
  parseCollectionConfig,
} from "@webstudio-is/content-engine";
import type { Asset } from "@webstudio-is/sdk";
import { $assets, $project } from "~/shared/sync/data-stores";
import { CollectionSettingsDialog } from "./collection-settings-dialog";

const createAsset = ({
  id,
  filename,
  format,
}: {
  id: string;
  filename: string;
  format: string;
}): Asset => ({
  id,
  projectId: "storybook-project",
  name: `${filename}.${format}`,
  filename,
  folderId: "posts",
  type: "file",
  format,
  size: 1,
  description: null,
  createdAt: "2026-09-03T00:00:00.000Z",
  meta: {},
});

const configAsset = createAsset({
  id: "collection-config",
  filename: "collection",
  format: "json",
});
const templateAsset = createAsset({
  id: "collection-template",
  filename: "template",
  format: "mdx",
});
const configValue = JSON.parse(createDefaultCollectionConfig());
configValue.properties.summary = {
  title: "Summary",
  type: "string",
  minLength: 20,
  maxLength: 240,
  "x-webstudio": { control: "textarea" },
};
configValue.properties.readingTime = {
  title: "Reading time",
  type: "integer",
  minimum: 1,
  maximum: 60,
};
const template = `---
title: Untitled post
slug: untitled-post
summary: A short description of this post.
draft: true
readingTime: 5
---

# Untitled post

Start writing here.
`;
configValue.properties = {
  title: configValue.properties.title,
  slug: configValue.properties.slug,
  summary: configValue.properties.summary,
  readingTime: configValue.properties.readingTime,
  draft: configValue.properties.draft,
};

const CollectionSettingsStory = (
  props: ComponentProps<typeof CollectionSettingsDialog>
) => {
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    const previousProject = $project.get();
    const previousAssets = $assets.get();
    $project.set({ id: "storybook-project" } as never);
    $assets.set(
      new Map([
        [configAsset.id, configAsset],
        [templateAsset.id, templateAsset],
      ])
    );
    setReady(true);
    return () => {
      $project.set(previousProject);
      $assets.set(previousAssets);
    };
  }, []);
  return ready && <CollectionSettingsDialog {...props} />;
};

const meta = {
  title: "Asset Manager/Collection settings",
  component: CollectionSettingsDialog,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof CollectionSettingsDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => <CollectionSettingsStory {...args} />,
  args: {
    open: true,
    onOpenChange: () => undefined,
    readTemplateSource: async () => template,
    updateContent: async ({ asset }) => asset,
    convertCollection: async () => undefined,
    updateConfigAndTemplateName: async ({ collection, templateFilename }) => ({
      configAsset: collection.configAsset,
      templateAsset: {
        ...collection.templateAsset,
        filename: templateFilename,
      },
    }),
    collection: {
      status: "ready",
      folderId: "posts",
      configAsset,
      templateAsset,
      config: parseCollectionConfig(JSON.stringify(configValue)),
      templateProperties: {
        title: "Untitled post",
        slug: "untitled-post",
        summary: "A short description of this post.",
        draft: true,
        readingTime: 5,
      },
    },
  },
};
