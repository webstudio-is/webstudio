import type { Meta, StoryObj } from "@storybook/react";
import { useLayoutEffect, useState, type ComponentProps } from "react";
import {
  createDefaultCollectionConfig,
  parseCollectionConfig,
} from "@webstudio-is/content-engine";
import type { Asset } from "@webstudio-is/sdk";
import { CreateCollectionEntryDialog } from "./create-collection-entry-dialog";
import { $assets, $project } from "~/shared/sync/data-stores";

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
  createdAt: "2026-09-07T00:00:00.000Z",
  meta: {},
});

const configValue = JSON.parse(createDefaultCollectionConfig());
configValue.properties.summary = {
  title: "Summary",
  type: "string",
  maxLength: 240,
  "x-webstudio": { control: "textarea" },
};
configValue.properties.readingTime = {
  title: "Reading time",
  type: "integer",
  minimum: 1,
  maximum: 60,
};
configValue.properties = {
  title: configValue.properties.title,
  slug: configValue.properties.slug,
  summary: configValue.properties.summary,
  readingTime: configValue.properties.readingTime,
  draft: configValue.properties.draft,
};

const createdAsset = createAsset({
  id: "story-entry",
  filename: "entry",
  format: "mdx",
});
const EntryStory = (
  props: ComponentProps<typeof CreateCollectionEntryDialog>
) => {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(props.open);
  useLayoutEffect(() => {
    const project = $project.get();
    const assets = $assets.get();
    $project.set({ id: "storybook-project" } as never);
    $assets.set(new Map([[createdAsset.id, createdAsset]]));
    setReady(true);
    return () => {
      $project.set(project);
      $assets.set(assets);
    };
  }, []);
  return (
    ready && (
      <CreateCollectionEntryDialog
        {...props}
        open={open}
        onOpenChange={setOpen}
      />
    )
  );
};

const meta = {
  title: "Asset Manager/Create collection entry",
  component: CreateCollectionEntryDialog,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof CreateCollectionEntryDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => <EntryStory {...args} />,
  args: {
    open: true,
    onOpenChange: () => undefined,
    createEntry: async () => createdAsset,
    collection: {
      status: "ready",
      folderId: "posts",
      configAsset: createAsset({
        id: "collection-config",
        filename: "collection",
        format: "json",
      }),
      templateAsset: createAsset({
        id: "collection-template",
        filename: "template",
        format: "mdx",
      }),
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

export const LongForm: Story = {
  ...Default,
  args: {
    ...Default.args,
    collection: {
      ...Default.args.collection,
      config: parseCollectionConfig(
        JSON.stringify({
          ...configValue,
          properties: {
            ...configValue.properties,
            author: { title: "Author", type: "string" },
            category: { title: "Category", type: "string" },
            image: { title: "Image URL", type: "string" },
            imageDescription: { title: "Image description", type: "string" },
            seoTitle: { title: "SEO title", type: "string" },
            seoDescription: {
              title: "SEO description",
              type: "string",
              "x-webstudio": { control: "textarea" },
            },
          },
        })
      ),
    },
  },
};
