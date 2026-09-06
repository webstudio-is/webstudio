import { useLayoutEffect, type ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  createDefaultCollectionConfig,
  parseCollectionConfig,
} from "@webstudio-is/content-engine";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { Asset } from "@webstudio-is/sdk";
import { $assets, $pages, $project } from "~/shared/sync/data-stores";
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
  default: 5,
};
configValue["x-webstudio"].previewPage = "blog-post";

const pages = createDefaultPages({ rootInstanceId: "root" });
pages.pages.set("blog-post", {
  id: "blog-post",
  name: "Blog post",
  title: "Blog post",
  path: "/blog/:slug",
  rootInstanceId: "blog-post-root",
  meta: {},
});
pages.folders.get(pages.rootFolderId)?.children.push("blog-post");

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

const CollectionSettingsStory = (
  props: ComponentProps<typeof CollectionSettingsDialog>
) => {
  useLayoutEffect(() => {
    const previousProject = $project.get();
    const previousPages = $pages.get();
    const previousAssets = $assets.get();
    $project.set({ id: "storybook-project" } as never);
    $pages.set(pages);
    $assets.set(
      new Map([
        [configAsset.id, configAsset],
        [templateAsset.id, templateAsset],
      ])
    );
    return () => {
      $project.set(previousProject);
      $pages.set(previousPages);
      $assets.set(previousAssets);
    };
  }, []);
  return <CollectionSettingsDialog {...props} />;
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
