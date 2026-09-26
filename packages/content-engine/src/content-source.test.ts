import { describe, expect, test, vi } from "vitest";
import {
  createTextAssetSourceValidator,
  validateTextAssetSource,
  validateTextAssetSourceBytes,
} from "./mdx";
import { createCanonicalAssetFileEntry } from "./canonical";
import {
  getContentArtifactReferencedAssetIds,
  getContentArtifactRuntimeAssetIds,
} from "./content-artifact";
import { createContentDatabase } from "./content-database";
import {
  createContentRuntimeArtifact,
  getContentRuntimeArtifactRuntimeAssetIds,
} from "./content-runtime-artifact";
import { createPublishedAssetResourceFetch } from "./published-runtime";
import {
  createContentCompilationPlan,
  prepareContentCompilerEntries,
  type ContentCompilationPlan,
} from "./compilation-plan";
import {
  compileContentSource,
  compileContentUntilPlanIsStable,
  ContentSourceChangedError,
  createContentSourceFile,
  materializeContentSource,
  type ContentSource,
  type ContentSourceFile,
} from "./content-source";

const projectId = "project";

describe("compileContentUntilPlanIsStable", () => {
  const initialPlan: ContentCompilationPlan = {
    standardFields: "all",
    structuredPropertyPaths: "all",
    excerpt: false,
    metadataError: false,
    queries: [],
  };

  test("keeps the initial artifact when the resolved plan is unchanged", async () => {
    const equivalentPlan: ContentCompilationPlan = {
      queries: [],
      metadataError: false,
      excerpt: false,
      structuredPropertyPaths: "all",
      standardFields: "all",
    };
    const artifact = {};
    const compile = vi.fn(async () => artifact);
    const resolvePlan = vi.fn(async () => equivalentPlan);

    await expect(
      compileContentUntilPlanIsStable({
        plan: initialPlan,
        compile,
        resolvePlan,
      })
    ).resolves.toBe(artifact);

    expect(compile).toHaveBeenCalledOnce();
    expect(resolvePlan).toHaveBeenCalledOnce();
  });

  test("recompiles when dependency discovery expands the plan", async () => {
    const expandedPlan: ContentCompilationPlan = {
      ...initialPlan,
      excerpt: true,
    };
    const compile = vi
      .fn()
      .mockResolvedValueOnce({ pass: 0 })
      .mockResolvedValueOnce({ pass: 1 });
    const resolvePlan = vi
      .fn()
      .mockResolvedValueOnce(expandedPlan)
      .mockResolvedValueOnce(expandedPlan);

    const artifact = await compileContentUntilPlanIsStable({
      plan: initialPlan,
      compile,
      resolvePlan,
    });

    expect(artifact).toEqual({ pass: 1 });
    expect(compile.mock.calls).toEqual([[initialPlan], [expandedPlan]]);
    expect(resolvePlan).toHaveBeenCalledTimes(2);
  });

  test("rejects dependency discovery that never stabilizes", async () => {
    const compile = vi.fn(async (_plan: ContentCompilationPlan) => ({
      pass: compile.mock.calls.length,
    }));
    const resolvePlan = vi.fn(async ({ pass }: { pass: number }) => ({
      ...initialPlan,
      excerpt: pass % 2 === 1,
    }));

    await expect(
      compileContentUntilPlanIsStable({
        plan: initialPlan,
        compile,
        resolvePlan,
      })
    ).rejects.toThrow(
      "Dynamic MDX dependency closure exceeds the safe publication depth"
    );
    expect(compile).toHaveBeenCalledTimes(21);
    expect(resolvePlan).toHaveBeenCalledTimes(21);
  });
});

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
  test.each([
    "zero limit",
    "no match",
    "zero limit with dynamic filter",
    "zero limit with dynamic offset",
  ])(
    "omits the asset-path map when no article body can be selected: %s",
    async (selection) => {
      const article = createFile({ id: "article" });
      const files = [
        article,
        ...Array.from({ length: 100 }, (_, index) =>
          createFile({
            id: `image-${index}`,
            path: `images/${"long-name-".repeat(12)}${index}.svg`,
            contentType: "image/svg+xml",
          })
        ),
      ];
      const plan = createContentCompilationPlan([
        {
          id: "empty",
          where: {
            field: ["id"],
            operator: "eq",
            value:
              selection === "zero limit with dynamic filter"
                ? { type: "dynamic" }
                : {
                    type: "literal",
                    value: selection === "no match" ? "missing" : "article",
                  },
          },
          sort: [],
          limit: { type: "literal", value: selection === "no match" ? 1 : 0 },
          offset:
            selection === "zero limit with dynamic offset"
              ? { type: "dynamic" }
              : { type: "literal", value: 0 },
          output: { mode: "base", includeMetadata: false },
          content: { mode: "markdown-body-ref" },
        },
      ]);
      const read = vi.fn(async () => "");
      const { artifact } = await compileContentSource({
        projectId,
        plan,
        maxBytes: 4096,
        source: {
          async openSnapshot() {
            return {
              revision: "snapshot",
              files,
              loadEntries: () =>
                prepareContentCompilerEntries({
                  entries: files.map(createEntry),
                  plan,
                  loadContent: read,
                }),
              async loadDocumentSources() {
                return [
                  {
                    id: article.id,
                    source: {
                      async *[Symbol.asyncIterator]() {
                        yield new TextEncoder().encode(await read());
                      },
                    },
                  },
                ];
              },
              async isCurrent() {
                return true;
              },
            };
          },
        },
      });
      expect(artifact.assetPaths).toBeUndefined();
      expect(read).not.toHaveBeenCalled();
    }
  );

  test.each(["md", "mdx"])(
    "compiles a query over 300 referenced %s articles without reading bodies and loads only the requested article",
    async (extension) => {
      const body =
        "---\ntitle: Article\n---\nArticle body\n![Cover](./cover.svg)\n";
      const articles = Array.from({ length: 300 }, (_, index) =>
        createFile({
          id: `article-${index}`,
          path: `blog/article-${index}.${extension}`,
          contentType: extension === "md" ? "text/markdown" : "text/mdx",
          size: new TextEncoder().encode(body).byteLength,
        })
      );
      const files = [
        ...articles,
        createFile({
          id: "cover",
          path: "blog/cover.svg",
          contentType: "image/svg+xml",
        }),
      ];
      const plan = createContentCompilationPlan([
        {
          id: "article",
          result: "one",
          where: {
            field: ["id"],
            operator: "eq",
            value: { type: "dynamic" },
          },
          sort: [],
          limit: { type: "literal", value: 1 },
          offset: { type: "literal", value: 0 },
          output: { mode: "base", includeMetadata: false },
          content: { mode: "markdown-body-ref" },
        },
      ]);
      const readAtPublish = vi.fn(async () => body);
      const source: ContentSource = {
        async openSnapshot() {
          return {
            revision: "snapshot",
            files,
            loadEntries: () =>
              prepareContentCompilerEntries({
                entries: files.map((file) => ({
                  ...createEntry(file),
                  metadataRequirements: {
                    structuredProperties: true,
                    excerpt: false,
                  },
                })),
                plan,
                loadContent: readAtPublish,
              }),
            async loadDocumentSources() {
              return articles.map(({ id }) => ({
                id,
                source: {
                  async *[Symbol.asyncIterator]() {
                    yield new TextEncoder().encode(await readAtPublish());
                  },
                },
              }));
            },
            async isCurrent() {
              return true;
            },
          };
        },
      };
      const { artifact, diagnostics } = await compileContentSource({
        projectId,
        source,
        plan,
      });
      expect(readAtPublish.mock.calls.length).toBe(0);
      expect(artifact.contents).toBeUndefined();
      expect(artifact.documents).toHaveLength(300);
      expect(diagnostics.omittedDocumentCount).toBe(0);

      const fetchDocument = vi.fn(async () => new Response(body));
      const runtimeArtifact = createContentRuntimeArtifact(artifact);
      const publishedAssetIds = new Set(
        getContentArtifactRuntimeAssetIds({
          artifact,
          includeDocuments: true,
        })
      );
      const runtimeAssetIds = new Set(
        getContentRuntimeArtifactRuntimeAssetIds({
          artifact: runtimeArtifact,
          includeDocuments: true,
        })
      );
      const runtimeFetch = createPublishedAssetResourceFetch({
        baseUrl: "https://site.example",
        deploymentId: `articles-${extension}`,
        artifact: runtimeArtifact,
        runtimeAssets: Object.fromEntries(
          files
            .filter(
              ({ id }) => publishedAssetIds.has(id) && runtimeAssetIds.has(id)
            )
            .map((file) => [
              file.id,
              { url: `/assets/${file.id}`, contentRef: file.contentRef },
            ])
        ),
        fetchDocument,
      });
      const response = await runtimeFetch("/$resources/assets", {
        method: "POST",
        body: JSON.stringify({
          query: {
            result: "one",
            where: { field: ["id"], operator: "eq", value: "article-175" },
            output: { mode: "base", includeMetadata: false },
            content: { mode: "markdown-body-ref" },
          },
        }),
      });
      await expect(response?.json()).resolves.toMatchObject({
        item: {
          id: "article-175",
          content: { text: "Article body\n![Cover](/assets/cover)\n" },
        },
        totalCount: 1,
      });
      expect(response?.status).toBe(200);
      expect(fetchDocument).toHaveBeenCalledOnce();
    }
  );

  test.each(
    ["md", "mdx"].flatMap((extension) =>
      (["none", "full", "markdown-body-ref"] as const).flatMap((mode) =>
        (["current", "missing", "invalid"] as const).map((metadata) => ({
          extension,
          mode,
          metadata,
        }))
      )
    )
  )(
    "reads $extension bodies only when needed: $mode / $metadata metadata",
    async ({ extension, mode, metadata }) => {
      const file = createFile({
        id: "article",
        path: `article.${extension}`,
        contentType: extension === "md" ? "text/markdown" : "text/mdx",
      });
      const plan = createContentCompilationPlan([
        {
          id: "titles",
          where: { all: [] },
          sort: [],
          limit: { type: "literal", value: 10 },
          offset: { type: "literal", value: 0 },
          output: {
            mode: "fields",
            fields: [["properties", "title"]],
            includeMetadata: false,
          },
          content: { mode },
        },
      ]);
      const read = vi.fn(async () => "---\ntitle: article\n---\nBody");
      const entry = createEntry(file);
      const source: ContentSource = {
        async openSnapshot() {
          return {
            revision: "snapshot",
            files: [file],
            loadEntries: () =>
              prepareContentCompilerEntries({
                entries: [
                  {
                    ...entry,
                    metadataRequirements: {
                      structuredProperties: metadata !== "missing",
                      excerpt: false,
                    },
                    document: {
                      ...entry.document,
                      ...(metadata === "invalid"
                        ? {
                            metadataError: {
                              code: "MARKDOWN_INVALID_FRONTMATTER",
                              message: "Invalid frontmatter",
                            },
                          }
                        : {}),
                    },
                  },
                ],
                plan,
                loadContent: read,
              }),
            async loadDocumentSources() {
              return [
                {
                  id: file.id,
                  source: {
                    async *[Symbol.asyncIterator]() {
                      yield new TextEncoder().encode(await read());
                    },
                  },
                },
              ];
            },
            async isCurrent() {
              return true;
            },
          };
        },
      };
      const result = await materializeContentSource({ source, plan });
      expect(result.entries[0].document.properties).toEqual({
        title: "article",
      });
      if (mode !== "full" && metadata === "current") {
        expect(result.documentContents).toBeUndefined();
        if (mode === "none") {
          expect(result.documentGraph).toBeUndefined();
        }
        expect(read).not.toHaveBeenCalled();
      } else {
        expect(read).toHaveBeenCalled();
      }
      if (mode === "full") {
        expect(result.entries[0].content).toContain("Body");
      } else {
        expect(result.entries[0].content).toBeUndefined();
      }
    }
  );

  test("reuses source validation across byte loading and compilation passes without losing per-file diagnostics", async () => {
    const validate = vi.fn(validateTextAssetSource);
    const validateSource = createTextAssetSourceValidator(
      {},
      { validateTextAssetSource: validate }
    );
    const files = [
      createFile({ id: "one", path: "one.mdx", contentType: "text/mdx" }),
      createFile({ id: "two", path: "two.mdx", contentType: "text/mdx" }),
    ];
    let content = "{unsafe()}";
    const source: ContentSource = {
      async openSnapshot() {
        return {
          revision: "snapshot",
          files,
          async loadEntries() {
            const validated = await validateTextAssetSourceBytes({
              source: new TextEncoder().encode(content),
              format: "mdx",
              validateSource,
            });
            return files.map((file) => ({
              ...createEntry(file),
              content: validated.source,
            }));
          },
          async isCurrent() {
            return true;
          },
        };
      },
    };
    const first = await materializeContentSource({ source, validateSource });
    expect(first.sourceIssues).toMatchObject([
      {
        assetId: "one",
        path: "one.mdx",
        severity: "warning",
        code: "unsafe-mdx",
      },
      {
        assetId: "two",
        path: "two.mdx",
        severity: "warning",
        code: "unsafe-mdx",
      },
    ]);
    expect(await materializeContentSource({ source, validateSource })).toEqual(
      first
    );
    expect(validate).toHaveBeenCalledOnce();
    content = "<ws.element";
    await expect(
      materializeContentSource({ source, validateSource })
    ).rejects.toMatchObject({
      diagnostics: [
        { assetId: "one", severity: "error" },
        { assetId: "two", severity: "error" },
      ],
    });
    expect(validate).toHaveBeenCalledTimes(2);
  });

  test("reports all fatal MDX errors from selected files", async () => {
    const files = [
      createFile({ id: "one", path: "blog/one.mdx", contentType: "text/mdx" }),
      createFile({ id: "two", path: "blog/two.mdx", contentType: "text/mdx" }),
    ];
    const source: ContentSource = {
      async openSnapshot() {
        return {
          revision: "snapshot",
          files,
          async loadEntries() {
            return files.map((file) => ({
              ...createEntry(file),
              content: "<ws.element",
            }));
          },
          async loadDocumentSources() {
            return files.map(({ id }) => ({ id, source: "<ws.element" }));
          },
          async isCurrent() {
            return true;
          },
        };
      },
    };

    await expect(
      compileContentSource({ source, projectId })
    ).rejects.toMatchObject({
      diagnostics: [
        { severity: "error", assetId: "one", path: "blog/one.mdx" },
        { severity: "error", assetId: "two", path: "blog/two.mdx" },
      ],
    });
  });

  test("keeps all nonfatal Markdown errors as warnings", async () => {
    const file = createFile({ id: "post" });
    const source: ContentSource = {
      async openSnapshot() {
        return {
          revision: "snapshot",
          files: [file],
          async loadEntries() {
            return [
              {
                ...createEntry(file),
                content: "---\na: 1\na: 2\nb: 1\nb: 2\n---\n",
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
    expect(result.diagnostics.sourceIssues).toMatchObject([
      { severity: "warning", path: "blog/post.md", line: 3 },
      { severity: "warning", path: "blog/post.md", line: 5 },
    ]);
  });

  test("preserves complete MDX warning context", async () => {
    const file = createFile({
      id: "post",
      path: "blog/post.mdx",
      contentType: "text/mdx",
    });
    const source: ContentSource = {
      async openSnapshot() {
        return {
          revision: "snapshot",
          files: [file],
          async loadEntries() {
            return [{ ...createEntry(file), content: "{1 + 1}" }];
          },
          async isCurrent() {
            return true;
          },
        };
      },
    };

    const result = await compileContentSource({ source, projectId });
    expect(result.diagnostics.sourceIssues).toEqual([
      expect.objectContaining({
        severity: "warning",
        code: "unsafe-mdx",
        assetId: "post",
        path: "blog/post.mdx",
        nodeType: "mdxFlowExpression",
        reason: "Executable MDX expressions are not supported",
        sourceRange: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 8, offset: 7 },
        },
      }),
    ]);
  });

  test("warns when a selected source cannot be validated within limits", async () => {
    const file = createFile({ id: "post" });
    const source: ContentSource = {
      async openSnapshot() {
        return {
          revision: "snapshot",
          files: [file],
          async loadEntries() {
            return [{ ...createEntry(file), contentRequired: true }];
          },
          async isCurrent() {
            return true;
          },
        };
      },
    };

    const result = await compileContentSource({ source, projectId });
    expect(result.diagnostics.sourceIssues).toEqual([
      {
        severity: "warning",
        code: "SOURCE_VALIDATION_UNAVAILABLE",
        message: "File content could not be validated within the query limits",
        assetId: "post",
        path: "blog/post.md",
      },
    ]);
  });

  test("compiles MDX sources into the document graph", async () => {
    const mdx =
      '---\nauthor:\n  $ref: ./author.json#/profile\n---\n<ws.element ws:name="Hero">Hello</ws.element>\n';
    const post = createFile({
      id: "post",
      path: "blog/post.mdx",
      contentType: "text/mdx",
      contentRef: "revisions/post.mdx",
      size: new TextEncoder().encode(mdx).byteLength,
    });
    const author = createFile({
      id: "author",
      path: "blog/author.json",
      contentType: "application/json",
    });
    const source = createDocumentSource({
      files: [post, author],
      sources: {
        post: mdx,
        author: '{"profile":{"name":"Ada"}}',
      },
    });

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

    expect(
      result.documentGraph?.nodes.map(({ id, format }) => [id, format])
    ).toEqual([
      ["author", "json"],
      ["post", "mdx"],
    ]);
    expect(result.documentGraph?.edges).toEqual([
      expect.objectContaining({
        sourceId: "post",
        referenceId: "#frontmatter/author",
      }),
    ]);
  });

  test("resolves Asset values from referenced document frontmatter", async () => {
    const post = createFile({
      id: "post",
      path: "blog/post.mdx",
      contentType: "text/mdx",
    });
    const author = createFile({
      id: "author",
      path: "blog/author.md",
    });
    const avatar = createFile({
      id: "avatar",
      path: "blog/avatar.png",
      contentType: "image/png",
    });
    const sources = {
      post: "---\nauthor:\n  $ref: ./author.md#frontmatter\n---\nPost\n",
      author: "---\nname: Ada\nprofileImage:\n  $ref: ./avatar.png\n---\n",
    };
    const source: ContentSource = {
      async openSnapshot() {
        return {
          revision: "snapshot",
          files: [post, author, avatar],
          async loadEntries() {
            const entry = createEntry(post);
            return [
              {
                ...entry,
                document: {
                  ...entry.document,
                  properties: {
                    author: { $ref: "./author.md#frontmatter" },
                  },
                },
                content: sources.post,
              } as typeof entry,
            ];
          },
          async loadDocumentSources() {
            return [
              { id: "post", source: sources.post },
              { id: "author", source: sources.author },
            ];
          },
          async isCurrent() {
            return true;
          },
        };
      },
    };
    const query = {
      where: { all: [] },
      sort: [],
      limit: 1,
      output: {
        mode: "fields" as const,
        includeMetadata: false,
        fields: [["properties", "author"]],
      },
      content: { mode: "full" as const },
    };
    const compiled = await compileContentSource({
      source,
      projectId,
      plan: {
        standardFields: [],
        structuredPropertyPaths: [["properties", "author"]],
        excerpt: false,
        metadataError: false,
        queries: [
          {
            id: "post",
            ...query,
            limit: { type: "literal", value: 1 },
            offset: { type: "literal", value: 0 },
          },
        ],
      },
    });

    expect(compiled.artifact.assetValueReferences?.author).toEqual([
      {
        path: ["properties", "profileImage"],
        assetId: "avatar",
        structured: true,
      },
    ]);
    expect(compiled.artifact.contents?.[author.contentRef]).toBe(
      sources.author
    );
    const database = createContentDatabase({ artifact: compiled.artifact });
    await expect(
      database.queryWithDocumentGraph({
        request: { query },
        load: async (node) => ({
          format: node.format as "markdown" | "mdx",
          revision: node.revision,
          source: sources[node.id as keyof typeof sources],
        }),
        runtimeAssets: {
          avatar: { url: "/cgi/image/avatar.png?format=raw" },
        },
      })
    ).resolves.toMatchObject({
      items: [
        {
          properties: {
            author: {
              name: "Ada",
              profileImage: {
                id: "avatar",
                src: "/cgi/image/avatar.png?format=raw",
              },
            },
          },
        },
      ],
    });
  });

  test("keeps missing nested Asset refs out of the document graph", async () => {
    const post = createFile({
      id: "post",
      path: "blog/post.mdx",
      contentType: "text/mdx",
    });
    const author = createFile({
      id: "author",
      path: "authors/author.md",
    });
    const avatar = createFile({
      id: "avatar",
      path: "authors/avatar.png",
      contentType: "image/png",
    });
    const sources = {
      post: "---\nauthor:\n  $ref: ../authors/author.md#frontmatter\n---\nPost\n",
      author:
        "---\nprofileImage: ./avatar.png\ngallery:\n  - $ref: ./avatar.png\n  - $ref: ./missing.png\n---\n",
    };
    const source: ContentSource = {
      async openSnapshot() {
        return {
          revision: "snapshot",
          files: [post, author, avatar],
          async loadEntries() {
            const entry = createEntry(post);
            return [
              {
                ...entry,
                document: {
                  ...entry.document,
                  properties: {
                    author: { $ref: "../authors/author.md#frontmatter" },
                  },
                },
                content: sources.post,
              } as typeof entry,
            ];
          },
          async loadDocumentSources() {
            return [
              { id: "post", source: sources.post },
              { id: "author", source: sources.author },
            ];
          },
          async isCurrent() {
            return true;
          },
        };
      },
    };
    const query = {
      where: { all: [] },
      sort: [],
      limit: 1,
      output: {
        mode: "fields" as const,
        includeMetadata: false,
        fields: [["properties", "author"]],
      },
      content: { mode: "none" as const },
    };

    const compiled = await compileContentSource({
      source,
      projectId,
      plan: {
        standardFields: [],
        structuredPropertyPaths: [["properties", "author"]],
        excerpt: false,
        metadataError: false,
        queries: [
          {
            id: "post",
            ...query,
            limit: { type: "literal", value: 1 },
            offset: { type: "literal", value: 0 },
          },
        ],
      },
    });
    const database = createContentDatabase({ artifact: compiled.artifact });

    await expect(
      database.queryWithDocumentGraph({
        request: { query },
        load: async (node) => ({
          format: node.format as "markdown" | "mdx",
          revision: node.revision,
          source: sources[node.id as keyof typeof sources],
        }),
        runtimeAssets: {
          avatar: { url: "/cgi/image/avatar.png?format=raw" },
        },
      })
    ).resolves.toMatchObject({
      items: [
        {
          properties: {
            author: {
              profileImage: "/cgi/image/avatar.png?format=raw",
              gallery: [
                {
                  id: "avatar",
                  src: "/cgi/image/avatar.png?format=raw",
                },
                { $ref: "./missing.png" },
              ],
            },
          },
        },
      ],
    });
    expect(compiled.diagnostics.assetReferenceIssues).toEqual([
      {
        code: "ASSET_NOT_FOUND",
        sourceDocumentId: "author",
        referenceId: "#frontmatter/gallery/1",
        assetUrl: "https://content.webstudio.local/authors/missing.png",
      },
    ]);
  });

  test("reports a missing Asset ref when the root has no document edges", async () => {
    const post = createFile({ id: "post", path: "blog/post.mdx" });
    const source = createDocumentSource({
      files: [post],
      sources: {
        post: "---\ncover:\n  $ref: ./missing.png\n---\nPost\n",
      },
    });

    const compiled = await compileContentSource({
      source,
      projectId,
      plan: {
        standardFields: [],
        structuredPropertyPaths: [["properties", "cover"]],
        excerpt: false,
        metadataError: false,
        queries: [
          {
            id: "post",
            where: { all: [] },
            sort: [],
            limit: { type: "literal", value: 1 },
            offset: { type: "literal", value: 0 },
            output: {
              mode: "fields",
              includeMetadata: false,
              fields: [["properties", "cover"]],
            },
            content: { mode: "none" },
          },
        ],
      },
    });

    expect(compiled.documentGraph).toBeUndefined();
    expect(compiled.diagnostics.assetReferenceIssues).toEqual([
      {
        code: "ASSET_NOT_FOUND",
        sourceDocumentId: "post",
        referenceId: "#frontmatter/cover",
        assetUrl: "https://content.webstudio.local/blog/missing.png",
      },
    ]);
  });

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

  test("discovers structured Asset values in Markdown and JSON documents", async () => {
    const markdown = createFile({
      id: "markdown",
      path: "blog/posts/content-mode.md",
    });
    const json = createFile({
      id: "json",
      path: "team/member.json",
      contentType: "application/json",
      contentRef: "revisions/member.json",
    });
    const hero = createFile({
      id: "hero",
      path: "blog/posts/assets/content-mode.png",
      contentType: "image/png",
    });
    const portrait = createFile({
      id: "portrait",
      path: "team/images/portrait.png",
      contentType: "image/png",
    });
    const source: ContentSource = {
      async openSnapshot() {
        return {
          revision: "snapshot",
          files: [markdown, json, hero, portrait],
          async loadEntries() {
            const markdownEntry = createEntry(markdown);
            const jsonEntry = createEntry(json);
            return [
              {
                ...markdownEntry,
                document: {
                  ...markdownEntry.document,
                  properties: {
                    featureImage: { $ref: "./assets/content-mode.png" },
                    openGraph: {
                      images: ["./assets/content-mode.png#social"],
                    },
                  },
                },
              } as typeof markdownEntry,
              {
                ...jsonEntry,
                document: {
                  ...jsonEntry.document,
                  properties: { portrait: "./assets/portrait.png" },
                },
              } as typeof jsonEntry,
            ];
          },
          async isCurrent() {
            return true;
          },
        };
      },
    };

    const result = await compileContentSource({ source, projectId });

    expect(result.artifact.assetValueReferences).toEqual({
      json: [
        {
          path: ["properties", "portrait"],
          assetId: "portrait",
        },
      ],
      markdown: [
        {
          path: ["properties", "featureImage"],
          assetId: "hero",
          structured: true,
        },
        {
          path: ["properties", "openGraph", "images", 0],
          assetId: "hero",
          suffix: "#social",
        },
      ],
    });
  });

  test("exposes MDX frontmatter and authored Asset references", async () => {
    const mdx = createFile({
      id: "post",
      path: "blog/post.mdx",
      contentType: "text/mdx",
      contentRef: "revisions/post.mdx",
    });
    const cover = createFile({
      id: "cover",
      path: "blog/cover.png",
      contentType: "image/png",
    });
    const hero = createFile({
      id: "hero",
      path: "blog/hero.png",
      contentType: "image/png",
    });
    const video = createFile({
      id: "video",
      path: "blog/video.jpg",
      contentType: "image/jpeg",
    });
    const content = `---
cover: ./cover.png
---
![Hero](./hero.png#crop)

<ws.element ws:name="Card" poster="./video.jpg" />
`;
    const source: ContentSource = {
      async openSnapshot() {
        return {
          revision: "snapshot",
          files: [mdx, cover, hero, video],
          async loadEntries() {
            const entry = createEntry(mdx);
            return [
              {
                ...entry,
                document: {
                  ...entry.document,
                  properties: { cover: "./cover.png" },
                },
                content,
              } as typeof entry & { content: string },
            ];
          },
          async isCurrent() {
            return true;
          },
        };
      },
    };

    const result = await compileContentSource({ source, projectId });

    expect(result.artifact.documents[0]?.properties).toEqual({
      cover: "./cover.png",
    });
    expect(result.artifact.assetValueReferences).toEqual({
      post: [
        {
          path: ["properties", "cover"],
          assetId: "cover",
        },
        {
          path: ["children", 0, "children", 0, "props", 0, "value"],
          assetId: "hero",
          suffix: "#crop",
        },
        {
          path: ["children", 1, "props", 0, "value"],
          assetId: "video",
        },
      ],
    });
    expect(getContentArtifactReferencedAssetIds(result.artifact)).toEqual([
      "cover",
      "hero",
      "video",
    ]);
  });

  test("retains MDX body Asset references without frontmatter references", async () => {
    const mdx = createFile({
      id: "post",
      path: "blog/post.mdx",
      contentType: "text/mdx",
    });
    const hero = createFile({
      id: "hero",
      path: "blog/hero.png",
      contentType: "image/png",
    });
    const source: ContentSource = {
      async openSnapshot() {
        return {
          revision: "snapshot",
          files: [mdx, hero],
          async loadEntries() {
            const entry = createEntry(mdx);
            return [
              {
                ...entry,
                document: { ...entry.document, properties: {} },
                content: "![Hero](./hero.png)",
              } as typeof entry & { content: string },
            ];
          },
          async isCurrent() {
            return true;
          },
        };
      },
    };

    const result = await compileContentSource({ source, projectId });

    expect(
      result.artifact.assetValueReferences?.post?.map(({ assetId }) => assetId)
    ).toEqual(["hero"]);
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
    const markdown = "![Hero](../images/hero.png)";
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

    const compile = (mode: "full" | "markdown-body-ref") =>
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
        (await compile("markdown-body-ref")).artifact.assetReferences
      )
    ).toEqual({ "revisions/post.md": ["hero"] });
  });

  test.each([
    {
      label: "Markdown",
      extension: "md",
      contentType: "text/markdown",
      format: "markdown",
    },
    {
      label: "MDX",
      extension: "mdx",
      contentType: "text/mdx",
      format: "mdx",
    },
  ] as const)(
    "keeps $label body content in storage for graph-backed queries",
    async ({ extension, contentType, format }) => {
      const markdown = "---\ntitle: Post\nslug: post\n---\nStored body\n";
      const post = createFile({
        id: "post",
        path: `blog/post.${extension}`,
        contentType,
        contentRef: `revisions/post.${extension}`,
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
              content: { mode: "markdown-body-ref" },
            },
          ],
        },
      });

      expect(result.artifact.contents).toBeUndefined();
      expect(result.artifact.documentGraph).toMatchObject({
        nodes: [
          {
            id: "post",
            contentRef: `revisions/post.${extension}`,
            format,
          },
        ],
        edges: [],
      });
    }
  );

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
