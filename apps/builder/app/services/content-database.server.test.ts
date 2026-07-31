import { describe, expect, test } from "vitest";
import { createPublishedProjectBundleFixture } from "@webstudio-is/protocol/fixtures";
import { createStructuredAssetQueryResourceBody } from "@webstudio-is/sdk";
import {
  compileContentArtifact,
  createAssetIndex,
  createCanonicalAssetFileEntry,
} from "@webstudio-is/content-engine/compiler";
import { getContentDatabasePublishWarning } from "./content-database.server";

describe("content database publish warning", () => {
  test("classifies affected dynamic and static resources individually", async () => {
    const resourceId = "blog-posts";
    const overviewResourceId = "blog-overview";
    const createEntry = (id: string, bytes: number) =>
      createCanonicalAssetFileEntry({
        projectId: "source-project",
        document: {
          _id: id,
          _type: "asset.file",
          name: `${id}.md`,
          path: `blog/${id}.md`,
          key: id,
          extension: "md",
          mimeType: "text/markdown",
          size: bytes,
          revision: `revision-${id}`,
          contentRef: `files/${id}.md`,
          properties: { value: "x".repeat(bytes) },
        },
      });
    const assetIndex = await createAssetIndex({
      projectId: "source-project",
      entries: [createEntry("small", 100), createEntry("large", 10_000)],
      maxBytes: 5_000,
    });
    const bundle = createPublishedProjectBundleFixture({
      build: {
        props: [
          [
            "posts-prop",
            {
              id: "posts-prop",
              instanceId: "collection",
              name: "data",
              type: "resource",
              value: resourceId,
            },
          ],
          [
            "overview-prop",
            {
              id: "overview-prop",
              instanceId: "collection",
              name: "overview",
              type: "resource",
              value: overviewResourceId,
            },
          ],
        ],
        resources: [
          [
            resourceId,
            {
              id: resourceId,
              name: "Blog posts",
              control: "system",
              method: "post",
              url: '"/$resources/assets"',
              headers: [],
              body: createStructuredAssetQueryResourceBody({
                where: { all: [] },
                sort: [],
                limit: "pageSize",
                offset: "0",
                output: { mode: "base", includeMetadata: true },
                content: { mode: "none" },
              }),
            },
          ],
          [
            overviewResourceId,
            {
              id: overviewResourceId,
              name: "Blog overview",
              control: "system",
              method: "post",
              url: '"/$resources/assets"',
              headers: [],
              body: createStructuredAssetQueryResourceBody({
                where: { all: [] },
                sort: [],
                limit: "10",
                offset: "0",
                output: { mode: "base", includeMetadata: true },
                content: { mode: "none" },
              }),
            },
          ],
        ],
      },
      assetIndex,
    });

    expect(getContentDatabasePublishWarning(bundle)).toEqual({
      includedDocumentCount: 1,
      totalDocumentCount: 2,
      omittedDocumentCount: 1,
      usedKiB: 2,
      maxKiB: 5,
      omissionReason: "size",
      affectedResources: [
        { name: "Blog posts", kind: "dynamic" },
        { name: "Blog overview", kind: "static" },
      ],
    });
  });

  test("does nothing when the build has no content query", () => {
    expect(
      getContentDatabasePublishWarning(createPublishedProjectBundleFixture())
    ).toBeUndefined();
  });

  test("reports unavailable content for affected static resources", async () => {
    const resourceId = "blog-overview";
    const { artifact: assetIndex } = await compileContentArtifact({
      projectId: "source-project",
      entries: [
        {
          ...createCanonicalAssetFileEntry({
            projectId: "source-project",
            document: {
              _id: "post",
              _type: "asset.file",
              name: "post.md",
              path: "blog/post.md",
              key: "post",
              extension: "md",
              mimeType: "text/markdown",
              size: 100,
              revision: "revision-post",
              contentRef: "files/post.md",
              properties: {},
            },
          }),
          contentRequired: true,
        },
      ],
      maxBytes: 5_000,
    });
    const bundle = createPublishedProjectBundleFixture({
      build: {
        props: [
          [
            "overview-prop",
            {
              id: "overview-prop",
              instanceId: "collection",
              name: "data",
              type: "resource",
              value: resourceId,
            },
          ],
        ],
        resources: [
          [
            resourceId,
            {
              id: resourceId,
              name: "Blog overview",
              control: "system",
              method: "post",
              url: '"/$resources/assets"',
              headers: [],
              body: createStructuredAssetQueryResourceBody({
                where: { all: [] },
                sort: [],
                limit: "10",
                offset: "0",
                output: { mode: "base", includeMetadata: true },
                content: { mode: "none" },
              }),
            },
          ],
        ],
      },
      assetIndex,
    });

    expect(getContentDatabasePublishWarning(bundle)).toMatchObject({
      omissionReason: "unavailable",
      affectedResources: [{ name: "Blog overview", kind: "static" }],
    });
  });
});
