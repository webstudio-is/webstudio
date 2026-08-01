import { describe, expect, test } from "vitest";
import { createCanonicalAssetFileEntry } from "./canonical";
import {
  compileContentSource,
  ContentSourceChangedError,
  createContentSourceFile,
  type ContentSource,
  type ContentSourceFile,
} from "./content-source";

const projectId = "project";

const createFile = (
  values: Partial<ContentSourceFile> & Pick<ContentSourceFile, "id">
): ContentSourceFile => ({
  path: `blog/${values.id}.md`,
  contentType: "text/markdown",
  contentRef: `revisions/${values.id}.md`,
  revision: `revision-${values.id}`,
  size: 20,
  createdAt: "2026-07-27T00:00:00.000Z",
  ...values,
});

const createEntry = (file: ContentSourceFile) =>
  createCanonicalAssetFileEntry({
    projectId,
    document: {
      _id: file.id,
      _type: "asset.file",
      name: file.path.split("/").at(-1) ?? file.id,
      path: file.path,
      key: file.id,
      extension: file.path.split(".").at(-1) ?? "",
      mimeType: file.contentType,
      size: file.size,
      createdAt: file.createdAt,
      revision: file.revision,
      contentRef: file.contentRef,
      properties: { title: file.id },
    },
  });

const getRevision = (files: readonly ContentSourceFile[]) =>
  JSON.stringify(files);

const getReferencedAssetIds = (
  references: Awaited<
    ReturnType<typeof compileContentSource>
  >["artifact"]["assetReferences"]
) =>
  Object.fromEntries(
    Object.entries(references ?? {}).map(([contentRef, items]) => [
      contentRef,
      items.map(({ assetId }) => assetId),
    ])
  );

const createMutableSource = ({
  initial,
  mutate,
  mutateEveryAttempt = false,
}: {
  initial: readonly ContentSourceFile[];
  mutate: (files: readonly ContentSourceFile[]) => ContentSourceFile[];
  mutateEveryAttempt?: boolean;
}) => {
  let files = [...initial];
  let openCount = 0;
  const source: ContentSource = {
    async openSnapshot() {
      openCount += 1;
      const captured = files.map((file) => ({ ...file }));
      const revision = getRevision(captured);
      return {
        revision,
        files: captured,
        async loadEntries() {
          if (openCount === 1 || mutateEveryAttempt) {
            files = mutate(files);
          }
          return captured.map(createEntry);
        },
        async isCurrent() {
          return getRevision(files) === revision;
        },
      };
    },
  };
  return {
    source,
    getFiles: () => files,
    getOpenCount: () => openCount,
  };
};

const createDocumentSource = ({
  files,
  sources,
}: {
  files: readonly ContentSourceFile[];
  sources: Readonly<Partial<Record<string, string>>>;
}): ContentSource => ({
  async openSnapshot() {
    return {
      revision: getRevision(files),
      files,
      async loadEntries() {
        return files.map(createEntry);
      },
      async loadDocumentSources() {
        return files.map(({ id }) => ({ id, source: sources[id] ?? "" }));
      },
      async isCurrent() {
        return true;
      },
    };
  },
});

describe("content source snapshots", () => {
  test("analyzes only query roots and their reachable document targets", async () => {
    const post = createFile({ id: "post", path: "blog/post.md" });
    const author = createFile({
      id: "author",
      path: "blog/author.json",
      contentType: "application/json",
    });
    const unrelated = createFile({
      id: "unrelated",
      path: "other/broken.json",
      contentType: "application/json",
    });
    const source: ContentSource = {
      async openSnapshot() {
        return {
          revision: "snapshot",
          files: [post, author, unrelated],
          async loadEntries() {
            return [post].map(createEntry);
          },
          async loadDocumentSources() {
            return [
              {
                id: "post",
                source:
                  "---\nauthor:\n  $ref: ./author.json#/profile\n---\nPost\n",
              },
              { id: "author", source: '{"profile":{"name":"Ada"}}' },
              { id: "unrelated", source: "{invalid" },
            ];
          },
          async isCurrent() {
            return true;
          },
        };
      },
    };

    const result = await compileContentSource({
      source,
      projectId,
      plan: {
        standardFields: [],
        structuredPropertyPaths: [["properties", "author"]],
        excerpt: false,
        metadataError: false,
        queries: [
          {
            id: "posts",
            where: { all: [] },
            sort: [],
            limit: { type: "literal", value: 1 },
            offset: { type: "literal", value: 0 },
            output: {
              mode: "fields",
              includeMetadata: false,
              fields: [["properties", "author"]],
            },
            content: { mode: "none" },
          },
        ],
      },
    });

    expect(result.documentGraph?.nodes.map(({ id }) => id)).toEqual([
      "author",
      "post",
    ]);
    expect(result.documentGraph?.edges).toHaveLength(1);
  });

  test.each(["filter", "sort"] as const)(
    "discovers references used only by a query %s",
    async (usage) => {
      const post = createFile({
        id: "post",
        path: "posts/post.json",
        contentType: "application/json",
      });
      const author = createFile({
        id: "author",
        path: "authors/author.json",
        contentType: "application/json",
      });
      const source = createDocumentSource({
        files: [post, author],
        sources: {
          post: '{"author":{"$ref":"../authors/author.json"}}',
          author: '{"name":"Ada"}',
        },
      });
      const authorField: ["properties", "author", "name"] = [
        "properties",
        "author",
        "name",
      ];

      const result = await compileContentSource({
        source,
        projectId,
        plan: {
          standardFields: [["id"]],
          structuredPropertyPaths: [authorField],
          excerpt: false,
          metadataError: false,
          queries: [
            {
              id: usage,
              where:
                usage === "filter"
                  ? {
                      all: [
                        {
                          field: authorField,
                          operator: "eq",
                          value: { type: "literal", value: "Ada" },
                        },
                      ],
                    }
                  : { all: [] },
              sort:
                usage === "sort"
                  ? [{ field: authorField, direction: "asc" }]
                  : [],
              limit: { type: "literal", value: 1 },
              offset: { type: "literal", value: 0 },
              output: {
                mode: "fields",
                includeMetadata: false,
                fields: [["id"]],
              },
              content: { mode: "none" },
            },
          ],
        },
      });

      expect(result.documentGraph?.edges).toHaveLength(1);
      expect(result.documentGraph?.edges[0]).toMatchObject({
        sourceId: "post",
        referenceId: "#/author",
      });
    }
  );

  test("discovers document references without embedding source payloads", async () => {
    const post = createFile({
      id: "post",
      path: "posts/hello.json",
      contentType: "application/json",
      contentRef: "revisions/post.json",
    });
    const author = createFile({
      id: "author",
      path: "authors/ada.md",
      contentRef: "revisions/author.md",
    });
    const source: ContentSource = {
      async openSnapshot() {
        return {
          revision: "snapshot",
          files: [post, author],
          async loadEntries() {
            return [post, author].map(createEntry);
          },
          async loadDocumentSources() {
            return [
              {
                id: "post",
                source: '{"author":{"$ref":"../authors/ada.md#frontmatter"}}',
              },
              {
                id: "author",
                source: "---\nname: Ada\n---\nWriter.\n",
              },
            ];
          },
          async isCurrent() {
            return true;
          },
        };
      },
    };

    const result = await compileContentSource({ source, projectId });

    expect(result.artifact.contents).toBeUndefined();
    expect(result.documentGraph?.edges).toEqual([
      {
        sourceId: "post",
        referenceId: "#/author",
        reference: {
          documentId: "author",
          revision: "revision-author",
          representation: { type: "markdown-frontmatter" },
        },
      },
    ]);
    expect(result.artifact.documentGraph).toMatchObject({
      format: "webstudio-document-graph",
      version: 1,
      nodes: result.documentGraph?.nodes,
      edges: result.documentGraph?.edges,
      integrity: {
        algorithm: "sha256",
        checksum: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
      },
    });
  });

  test("resolves encoded references to asset paths containing URL delimiters", async () => {
    const post = createFile({
      id: "post",
      path: "content/post.json",
      contentType: "application/json",
    });
    const author = createFile({
      id: "author",
      path: "content/author#draft?50%.json",
      contentType: "application/json",
    });

    const result = await compileContentSource({
      projectId,
      source: createDocumentSource({
        files: [post, author],
        sources: {
          post: '{"author":{"$ref":"./author%23draft%3F50%25.json"}}',
          author: '{"name":"Ada"}',
        },
      }),
    });

    expect(result.documentGraph?.edges).toMatchObject([
      {
        sourceId: "post",
        reference: { documentId: "author" },
      },
    ]);
  });

  test.each([
    {
      name: "a missing target",
      files: [
        createFile({
          id: "post",
          path: "content/post.json",
          contentType: "application/json",
        }),
      ],
      sources: { post: '{"author":{"$ref":"./missing.json"}}' },
      code: "TARGET_NOT_FOUND",
    },
    {
      name: "a dependency cycle",
      files: [
        createFile({
          id: "post",
          path: "content/post.json",
          contentType: "application/json",
        }),
        createFile({
          id: "author",
          path: "content/author.json",
          contentType: "application/json",
        }),
      ],
      sources: {
        post: '{"author":{"$ref":"./author.json"}}',
        author: '{"post":{"$ref":"./post.json"}}',
      },
      code: "CYCLE",
    },
  ])("rejects $name while compiling stored document sources", async (input) => {
    await expect(
      compileContentSource({
        projectId,
        source: createDocumentSource(input),
      })
    ).rejects.toMatchObject({ code: input.code });
  });

  test("propagates changed target revisions into graph edges and artifact integrity", async () => {
    const compile = async (authorRevision: string) => {
      const post = createFile({
        id: "post",
        path: "content/post.json",
        contentType: "application/json",
      });
      const author = createFile({
        id: "author",
        path: "content/author.json",
        contentType: "application/json",
        revision: authorRevision,
      });
      return await compileContentSource({
        projectId,
        source: createDocumentSource({
          files: [post, author],
          sources: {
            post: '{"author":{"$ref":"./author.json"}}',
            author: '{"name":"Ada"}',
          },
        }),
      });
    };

    const first = await compile("author-r1");
    const second = await compile("author-r2");

    expect(first.documentGraph?.edges[0].reference.revision).toBe("author-r1");
    expect(second.documentGraph?.edges[0].reference.revision).toBe("author-r2");
    expect(first.artifact.integrity.checksum).not.toBe(
      second.artifact.integrity.checksum
    );
  });

  test("describes a compiler entry with the snapshot contract", () => {
    const file = createFile({ id: "post" });
    expect(createContentSourceFile(createEntry(file))).toEqual(file);
  });

  test("passes the artifact byte limit to content materialization", async () => {
    const file = createFile({ id: "post" });
    let maximumContentBytes: number | undefined;
    const source: ContentSource = {
      async openSnapshot() {
        return {
          revision: "snapshot",
          files: [file],
          async loadEntries(_plan, options) {
            maximumContentBytes = options?.maximumContentBytes;
            return [createEntry(file)];
          },
          async isCurrent() {
            return true;
          },
        };
      },
    };

    await compileContentSource({ source, projectId, maxBytes: 2_048 });

    expect(maximumContentBytes).toBe(2_048);
  });

  test("discovers relative asset dependencies from selected Markdown", async () => {
    const post = createFile({
      id: "post",
      path: "blog%20posts/posts/post.md",
    });
    const image = createFile({
      id: "hero",
      path: "blog%20posts/images/hero%20image.png",
      contentType: "image/png",
      contentRef: "revisions/hero.png",
    });
    const source: ContentSource = {
      async openSnapshot() {
        return {
          revision: "snapshot",
          files: [post, image],
          async loadEntries() {
            return [
              {
                ...createEntry(post),
                content: "![Hero](../images/hero%20image.png)",
              },
            ];
          },
          async isCurrent() {
            return true;
          },
        };
      },
    };

    const result = await compileContentSource({ source, projectId });

    expect(getReferencedAssetIds(result.artifact.assetReferences)).toEqual({
      "revisions/post.md": ["hero"],
    });
  });

  test("resolves the same relative URL independently for each Markdown folder", async () => {
    const firstPost = createFile({
      id: "first-post",
      path: "blog/first/post.md",
    });
    const secondPost = createFile({
      id: "second-post",
      path: "blog/second/post.md",
    });
    const firstImage = createFile({
      id: "first-image",
      path: "blog/first/hero.png",
      contentType: "image/png",
    });
    const secondImage = createFile({
      id: "second-image",
      path: "blog/second/hero.png",
      contentType: "image/png",
    });
    const source: ContentSource = {
      async openSnapshot() {
        return {
          revision: "snapshot",
          files: [firstPost, secondPost, firstImage, secondImage],
          async loadEntries() {
            return [firstPost, secondPost].map((file) => ({
              ...createEntry(file),
              content: "![Hero](./hero.png)",
            }));
          },
          async isCurrent() {
            return true;
          },
        };
      },
    };

    const result = await compileContentSource({ source, projectId });

    expect(getReferencedAssetIds(result.artifact.assetReferences)).toEqual({
      "revisions/first-post.md": ["first-image"],
      "revisions/second-post.md": ["second-image"],
    });
  });

  test("discovers asset IDs inserted by the Builder", async () => {
    const post = createFile({ id: "post", path: "blog/post.md" });
    const image = createFile({
      id: "hero",
      path: "images/hero.png",
      contentType: "image/png",
      contentRef: "revisions/hero.png",
    });
    const source: ContentSource = {
      async openSnapshot() {
        return {
          revision: "snapshot",
          files: [post, image],
          async loadEntries() {
            return [{ ...createEntry(post), content: "![Hero](hero)" }];
          },
          async isCurrent() {
            return true;
          },
        };
      },
    };

    const result = await compileContentSource({ source, projectId });

    expect(getReferencedAssetIds(result.artifact.assetReferences)).toEqual({
      "revisions/post.md": ["hero"],
    });
  });

  test("stores Markdown references only for parsed Markdown content", async () => {
    const post = createFile({ id: "post", path: "blog/post.md" });
    const image = createFile({
      id: "hero",
      path: "images/hero.png",
      contentType: "image/png",
    });
    const source: ContentSource = {
      async openSnapshot() {
        return {
          revision: "snapshot",
          files: [post, image],
          async loadEntries() {
            return [
              { ...createEntry(post), content: "![Hero](../images/hero.png)" },
            ];
          },
          async isCurrent() {
            return true;
          },
        };
      },
    };

    const compile = (mode: "full" | "markdown-body") =>
      compileContentSource({
        source,
        projectId,
        plan: {
          standardFields: [],
          structuredPropertyPaths: [],
          excerpt: false,
          metadataError: false,
          queries: [
            {
              id: "content",
              where: { all: [] },
              sort: [],
              limit: { type: "literal", value: 1 },
              offset: { type: "literal", value: 0 },
              output: { mode: "fields", includeMetadata: false, fields: [] },
              content: { mode },
            },
          ],
        },
      });

    expect((await compile("full")).artifact.assetReferences).toBeUndefined();
    expect(
      getReferencedAssetIds(
        (await compile("markdown-body")).artifact.assetReferences
      )
    ).toEqual({ "revisions/post.md": ["hero"] });
  });

  test("keeps Markdown body content in storage for graph-backed queries", async () => {
    const markdown = "---\ntitle: Post\nslug: post\n---\nStored body\n";
    const post = createFile({
      id: "post",
      path: "blog/post.md",
      size: new TextEncoder().encode(markdown).byteLength,
    });
    const source: ContentSource = {
      async openSnapshot() {
        return {
          revision: "snapshot",
          files: [post],
          async loadEntries() {
            return [{ ...createEntry(post), content: markdown }];
          },
          async loadDocumentSources() {
            return [{ id: post.id, source: markdown }];
          },
          async isCurrent() {
            return true;
          },
        };
      },
    };

    const result = await compileContentSource({
      source,
      projectId,
      plan: {
        standardFields: [["extension"], ["mimeType"], ["revision"], ["size"]],
        structuredPropertyPaths: [["properties", "slug"]],
        excerpt: false,
        metadataError: false,
        queries: [
          {
            id: "post",
            where: {
              all: [
                {
                  field: ["properties", "slug"],
                  operator: "eq",
                  value: { type: "dynamic" },
                },
              ],
            },
            sort: [],
            limit: { type: "literal", value: 1 },
            offset: { type: "literal", value: 0 },
            output: {
              mode: "fields",
              includeMetadata: false,
              fields: [["properties", "slug"]],
            },
            content: { mode: "markdown-body" },
          },
        ],
      },
    });

    expect(result.artifact.contents).toBeUndefined();
    expect(result.artifact.documentGraph).toMatchObject({
      nodes: [
        {
          id: "post",
          contentRef: "revisions/post.md",
          format: "markdown",
        },
      ],
      edges: [],
    });
  });

  test("does not resolve an ambiguous Asset path", async () => {
    const post = createFile({ id: "post", path: "blog/post.md" });
    const firstImage = createFile({
      id: "first-image",
      path: "blog/hero.png",
      contentType: "image/png",
    });
    const secondImage = createFile({
      id: "second-image",
      path: "blog/hero.png",
      contentType: "image/png",
    });
    const source: ContentSource = {
      async openSnapshot() {
        return {
          revision: "snapshot",
          files: [post, firstImage, secondImage],
          async loadEntries() {
            return [
              {
                ...createEntry(post),
                content: "![Hero](./hero.png)",
              },
            ];
          },
          async isCurrent() {
            return true;
          },
        };
      },
    };

    const result = await compileContentSource({ source, projectId });

    expect(result.artifact.assetReferences).toBeUndefined();
  });

  test.each([
    {
      name: "content replacement",
      mutate: ([file]: readonly ContentSourceFile[]) => [
        {
          ...file,
          revision: "replacement-revision",
          contentRef: "revisions/replacement.md",
        },
      ],
      expectedPath: "blog/article.md",
    },
    {
      name: "deletion",
      mutate: () => [],
      expectedPath: undefined,
    },
    {
      name: "folder movement",
      mutate: ([file]: readonly ContentSourceFile[]) => [
        { ...file, path: "archive/article.md" },
      ],
      expectedPath: "archive/article.md",
    },
    {
      name: "filesystem change",
      mutate: ([file]: readonly ContentSourceFile[]) => [
        { ...file, revision: "filesystem-revision", size: file.size + 1 },
      ],
      expectedPath: "blog/article.md",
    },
  ])("retries after $name", async ({ mutate, expectedPath }) => {
    const { source, getFiles, getOpenCount } = createMutableSource({
      initial: [createFile({ id: "article" })],
      mutate,
    });

    const result = await compileContentSource({ source, projectId });

    expect(getOpenCount()).toBe(2);
    expect(result.artifact.documents[0]?.path).toBe(expectedPath);
    expect(result.sourceRevision).toBe(getRevision(getFiles()));
  });

  test("fails clearly when the source changes on both attempts", async () => {
    const { source } = createMutableSource({
      initial: [createFile({ id: "article" })],
      mutate: ([file]) => [{ ...file, revision: `${file.revision}-changed` }],
      mutateEveryAttempt: true,
    });

    await expect(compileContentSource({ source, projectId })).rejects.toThrow(
      ContentSourceChangedError
    );
  });

  test("rejects entries that do not belong to the captured snapshot", async () => {
    const file = createFile({ id: "article" });
    const source: ContentSource = {
      async openSnapshot() {
        return {
          revision: file.revision,
          files: [file],
          async loadEntries() {
            return [createEntry({ ...file, contentRef: "revisions/other.md" })];
          },
          async isCurrent() {
            return true;
          },
        };
      },
    };

    await expect(compileContentSource({ source, projectId })).rejects.toThrow(
      "outside the captured snapshot"
    );
  });
});
