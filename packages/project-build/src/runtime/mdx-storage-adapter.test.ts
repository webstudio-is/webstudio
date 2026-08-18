import { describe, expect, test } from "vitest";
import {
  discoverMdxBodyAssetReferences,
  parseMdxDocument,
} from "@webstudio-is/content-engine/mdx";
import {
  elementComponent,
  type ContentBlockExternalContentIdentity,
  type Instance,
  type WebstudioFragment,
} from "@webstudio-is/sdk";
import {
  materializeMdxAuthoredContent,
  type MaterializedMdxAuthoredContentRoot,
} from "./mdx-authored-content";
import { prepareMdxContentStorageWrites } from "./mdx-storage-adapter";
import type { ContentStorageChange } from "./mutation";

const identity = (
  blockInstanceId: string,
  revision = `sha256:${blockInstanceId}`
): ContentBlockExternalContentIdentity => ({
  blockInstanceId,
  assetId: `${blockInstanceId}-asset`,
  revision,
  contentRef: `posts/${blockInstanceId}.mdx`,
  format: "mdx",
  renderScope: `page:/${blockInstanceId}`,
});

const load = async (
  blockInstanceId: string,
  source: string
): Promise<MaterializedMdxAuthoredContentRoot> =>
  materializeMdxAuthoredContent({
    identity: identity(blockInstanceId),
    document: await parseMdxDocument({ source }),
    templateMaterialization: {
      templates: [],
      diagnostics: [],
      dependencies: { templateNames: [], templates: [] },
    },
  });

const storageChange = (
  root: MaterializedMdxAuthoredContentRoot,
  payload: ContentStorageChange["payload"]
): ContentStorageChange => ({
  root: { type: "external", identity: root.identity },
  payload,
});

const authorizeAssetWrite = () => true;

const loadResolvedTemplate = async () => {
  const source = `<ws.element ws:name="Card" />`;
  const document = await parseMdxDocument({ source });
  const authoredTemplate = document.children[0];
  if (authoredTemplate?.type !== "template") {
    throw new Error("Expected authored template");
  }
  const fragment: WebstudioFragment = {
    children: [{ type: "id", value: "template-root" }],
    instances: [
      {
        type: "instance",
        id: "template-root",
        component: elementComponent,
        tag: "article",
        children: [{ type: "id", value: "template-heading" }],
      },
      {
        type: "instance",
        id: "template-heading",
        component: elementComponent,
        tag: "h2",
        children: [{ type: "text", value: "Template heading" }],
      },
    ],
    props: [],
    assets: [],
    dataSources: [],
    resources: [],
    breakpoints: [],
    styleSourceSelections: [],
    styleSources: [],
    styles: [],
  };
  return materializeMdxAuthoredContent({
    identity: identity("article"),
    document,
    templateMaterialization: {
      templates: [
        {
          type: "resolved-template",
          reference: {
            type: "resolved-template",
            path: [0],
            templateName: "Card",
            templateInstanceId: "card-template",
            props: authoredTemplate.props,
          },
          fragment,
        },
      ],
      diagnostics: [],
      dependencies: { templateNames: ["Card"], templates: [] },
    },
  });
};

const cloneTemplateExpansion = (root: MaterializedMdxAuthoredContentRoot) => {
  const clonedRoot: Instance = {
    ...root.fragment.instances[0],
    id: "cloned-template-root",
    children: [{ type: "id", value: "cloned-template-heading" }],
  };
  const clonedHeading: Instance = {
    ...root.fragment.instances[1],
    id: "cloned-template-heading",
  };
  return { clonedRoot, clonedHeading };
};

const insertClonedTemplateExpansion = (
  root: MaterializedMdxAuthoredContentRoot
): ContentStorageChange => {
  const { clonedRoot, clonedHeading } = cloneTemplateExpansion(root);
  return storageChange(root, [
    {
      namespace: "instances",
      patches: [
        { op: "add", path: [clonedRoot.id], value: clonedRoot },
        { op: "add", path: [clonedHeading.id], value: clonedHeading },
      ],
    },
    {
      namespace: "fragment",
      patches: [
        {
          op: "add",
          path: ["children", 1],
          value: { type: "id", value: clonedRoot.id },
        },
      ],
    },
  ]);
};

describe("MDX storage adapter", () => {
  test("applies text and prop changes while preserving authored metadata", async () => {
    const root = await load(
      "article",
      `---\ntitle: Article\n---\n\n{/* keep */}\n\n<ws.element ws:tag="p" class="before">Before</ws.element>\n\n<ws.element ws:name="Missing" stale="keep" />`
    );
    const paragraph = root.fragment.instances.find(({ tag }) => tag === "p")!;
    const classProp = root.fragment.props.find(({ name }) => name === "class")!;
    const before = structuredClone(root);

    const changes: ContentStorageChange[] = [
      storageChange(root, [
        {
          namespace: "instances",
          patches: [
            {
              op: "replace",
              path: [paragraph.id, "children", 0, "value"],
              value: "After",
            },
          ],
        },
        {
          namespace: "props",
          patches: [
            {
              op: "replace",
              path: [classProp.id, "value"],
              value: "after",
            },
          ],
        },
      ]),
    ];
    const request = {
      loadedRoots: [root],
      changes,
      authorizeAssetWrite,
    };
    const [write] = await prepareMdxContentStorageWrites(request);
    const [repeatedWrite] = await prepareMdxContentStorageWrites(request);
    const document = await parseMdxDocument({ source: write.source });

    expect(root).toEqual(before);
    expect(repeatedWrite).toEqual(write);
    expect(write.root.identity).toEqual(root.identity);
    expect(write.expectedRevision).toBe(root.identity.revision);
    expect(document.frontmatter.properties).toEqual({ title: "Article" });
    expect(document.children).toMatchObject([
      { type: "comment", value: "/* keep */" },
      {
        type: "element",
        props: [{ name: "class", value: "after" }],
        children: [{ type: "text", value: "After" }],
      },
      {
        type: "template",
        name: "Missing",
        props: [{ name: "stale", value: "keep" }],
      },
    ]);
  });

  test("applies structural fragment changes", async () => {
    const root = await load("article", "Paragraph");
    const inserted: Instance = {
      type: "instance",
      id: "inserted",
      component: elementComponent,
      tag: "aside",
      children: [{ type: "text", value: "Inserted" }],
    };
    const [write] = await prepareMdxContentStorageWrites({
      loadedRoots: [root],
      changes: [
        storageChange(root, [
          {
            namespace: "instances",
            patches: [{ op: "add", path: [inserted.id], value: inserted }],
          },
          {
            namespace: "fragment",
            patches: [
              {
                op: "add",
                path: ["children", 1],
                value: { type: "id", value: inserted.id },
              },
            ],
          },
        ]),
      ],
      authorizeAssetWrite,
    });

    expect(
      (await parseMdxDocument({ source: write.source })).children[1]
    ).toMatchObject({ type: "element", tag: "aside" });
  });

  test("combines repeated changes and preserves first-root ordering", async () => {
    const first = await load("first", "First");
    const second = await load("second", "Second");
    const firstId = first.fragment.instances[0].id;
    const secondId = second.fragment.instances[0].id;
    const authorized: ContentBlockExternalContentIdentity[] = [];
    const writes = await prepareMdxContentStorageWrites({
      loadedRoots: [first, second],
      changes: [
        storageChange(second, [
          {
            namespace: "instances",
            patches: [
              {
                op: "replace",
                path: [secondId, "children", 0, "value"],
                value: "Second updated",
              },
            ],
          },
        ]),
        storageChange(first, [
          {
            namespace: "instances",
            patches: [
              {
                op: "replace",
                path: [firstId, "children", 0, "value"],
                value: "Intermediate",
              },
            ],
          },
        ]),
        storageChange(first, [
          {
            namespace: "instances",
            patches: [
              {
                op: "replace",
                path: [firstId, "children", 0, "value"],
                value: "First updated",
              },
            ],
          },
        ]),
      ],
      authorizeAssetWrite: (requestedIdentity) => {
        authorized.push(requestedIdentity);
        return true;
      },
    });

    expect(writes.map(({ root }) => root.identity.blockInstanceId)).toEqual([
      "second",
      "first",
    ]);
    expect(authorized).toEqual([second.identity, first.identity]);
    expect(writes[1].source).toContain("First updated");
  });

  test("reconciles an atomic structural transfer across roots", async () => {
    const source = await load(
      "source",
      `<ws.element ws:tag="aside">Moved</ws.element>`
    );
    const target = await load("target", "Target");
    const moved = source.fragment.instances[0];
    const writes = await prepareMdxContentStorageWrites({
      loadedRoots: [source, target],
      changes: [
        storageChange(source, [
          {
            namespace: "fragment",
            patches: [{ op: "remove", path: ["children", 0] }],
          },
          {
            namespace: "instances",
            patches: [{ op: "remove", path: [moved.id] }],
          },
        ]),
        storageChange(target, [
          {
            namespace: "instances",
            patches: [{ op: "add", path: [moved.id], value: moved }],
          },
          {
            namespace: "fragment",
            patches: [
              {
                op: "add",
                path: ["children", 1],
                value: { type: "id", value: moved.id },
              },
            ],
          },
        ]),
      ],
      authorizeAssetWrite,
    });

    expect(
      (await parseMdxDocument({ source: writes[0].source })).children
    ).toEqual([]);
    expect(
      (await parseMdxDocument({ source: writes[1].source })).children[1]
    ).toMatchObject({ type: "element", tag: "aside" });
  });

  test("requires exact authorization and current loaded identity", async () => {
    const root = await load("article", "Article");
    const change = storageChange(root, [
      {
        namespace: "instances",
        patches: [
          {
            op: "replace",
            path: [root.fragment.instances[0].id, "children", 0, "value"],
            value: "Changed",
          },
        ],
      },
    ]);
    const authorizationRequests: ContentBlockExternalContentIdentity[] = [];
    await expect(
      prepareMdxContentStorageWrites({
        loadedRoots: [root],
        changes: [change],
        authorizeAssetWrite: (requestedIdentity) => {
          authorizationRequests.push(requestedIdentity);
          return false;
        },
      })
    ).rejects.toThrow("not authorized");
    expect(authorizationRequests).toEqual([root.identity]);

    await expect(
      prepareMdxContentStorageWrites({
        loadedRoots: [root],
        changes: [change],
        authorizeAssetWrite: () => undefined as unknown as boolean,
      })
    ).rejects.toThrow("not authorized");

    for (const mismatchedIdentity of [
      { ...root.identity, assetId: "other-asset" },
      { ...root.identity, contentRef: "posts/other.mdx" },
      { ...root.identity, revision: "sha256:stale" },
      { ...root.identity, renderScope: "page:/other" },
    ]) {
      await expect(
        prepareMdxContentStorageWrites({
          loadedRoots: [root],
          changes: [
            {
              ...change,
              root: { type: "external", identity: mismatchedIdentity },
            },
          ],
          authorizeAssetWrite,
        })
      ).rejects.toThrow("does not match its loaded Asset");
    }
  });

  test("rejects missing, duplicate, and non-MDX loaded roots", async () => {
    const root = await load("article", "Article");
    const change = storageChange(root, [
      {
        namespace: "instances",
        patches: [
          {
            op: "replace",
            path: [root.fragment.instances[0].id, "children", 0, "value"],
            value: "Changed",
          },
        ],
      },
    ]);

    await expect(
      prepareMdxContentStorageWrites({
        loadedRoots: [],
        changes: [change],
        authorizeAssetWrite,
      })
    ).rejects.toThrow("is not loaded");
    await expect(
      prepareMdxContentStorageWrites({
        loadedRoots: [root, root],
        changes: [change],
        authorizeAssetWrite,
      })
    ).rejects.toThrow("Duplicate loaded MDX storage root");
    await expect(
      prepareMdxContentStorageWrites({
        loadedRoots: [
          {
            ...root,
            identity: { ...root.identity, format: "md" },
          } as unknown as MaterializedMdxAuthoredContentRoot,
        ],
        changes: [],
        authorizeAssetWrite,
      })
    ).rejects.toThrow("is not MDX");

    await expect(
      prepareMdxContentStorageWrites({
        loadedRoots: [root],
        changes: [
          storageChange(root, []),
          storageChange(root, [{ namespace: "instances", patches: [] }]),
        ],
        authorizeAssetWrite: () => {
          throw new Error("Empty changes must not request authorization");
        },
      })
    ).resolves.toEqual([]);
  });

  test("preserves authored Asset references", async () => {
    const source = `<ws.element ws:tag="figure"><ws.element ws:tag="img" src="./hero.png" /><ws.element ws:tag="a" href="../files/guide.pdf">Read</ws.element></ws.element>`;
    const document = await parseMdxDocument({ source });
    const root = materializeMdxAuthoredContent({
      identity: identity("article"),
      document,
      templateMaterialization: {
        templates: [],
        diagnostics: [],
        dependencies: { templateNames: [], templates: [] },
      },
      assetReferences: discoverMdxBodyAssetReferences({
        document,
        sourcePath: "posts/article.mdx",
        assetIdsByPath: new Map([
          ["posts/hero.png", "hero-asset"],
          ["files/guide.pdf", "guide-asset"],
        ]),
      }),
    });
    const link = root.fragment.instances.find(({ tag }) => tag === "a")!;
    const [write] = await prepareMdxContentStorageWrites({
      loadedRoots: [root],
      changes: [
        storageChange(root, [
          {
            namespace: "instances",
            patches: [
              {
                op: "replace",
                path: [link.id, "children", 0, "value"],
                value: "Download",
              },
            ],
          },
        ]),
      ],
      authorizeAssetWrite,
    });

    expect(write.source).toContain('src="./hero.png"');
    expect(write.source).toContain('href="../files/guide.pdf"');
    expect(write.source).toContain("Download");
  });

  test("fails all roots atomically when any change is invalid", async () => {
    const first = await load("first", "First");
    const second = await load("second", "Second");
    const originalFirst = structuredClone(first.fragment);

    await expect(
      prepareMdxContentStorageWrites({
        loadedRoots: [first, second],
        changes: [
          storageChange(first, [
            {
              namespace: "instances",
              patches: [
                {
                  op: "replace",
                  path: [
                    first.fragment.instances[0].id,
                    "children",
                    0,
                    "value",
                  ],
                  value: "Changed",
                },
              ],
            },
          ]),
          storageChange(second, [
            {
              namespace: "pages",
              patches: [{ op: "remove", path: ["home"] }],
            },
          ]),
        ],
        authorizeAssetWrite,
      })
    ).rejects.toThrow("Unsupported MDX storage namespace");
    expect(first.fragment).toEqual(originalFirst);
  });

  test("rejects stale authored provenance", async () => {
    const root = await load("article", "Article");
    const stale = structuredClone(root);
    stale.fragment.instances[0].children = [
      { type: "text", value: "Out-of-band change" },
    ];

    await expect(
      prepareMdxContentStorageWrites({
        loadedRoots: [stale],
        changes: [
          storageChange(stale, [
            {
              namespace: "instances",
              patches: [
                {
                  op: "replace",
                  path: [
                    stale.fragment.instances[0].id,
                    "children",
                    0,
                    "value",
                  ],
                  value: "Requested change",
                },
              ],
            },
          ]),
        ],
        authorizeAssetWrite,
      })
    ).rejects.toThrow("authored provenance is stale");
  });

  test("rejects copied template expansions without shell provenance", async () => {
    const root = await loadResolvedTemplate();
    const change = insertClonedTemplateExpansion(root);

    await expect(
      prepareMdxContentStorageWrites({
        loadedRoots: [root],
        changes: [
          {
            ...change,
            copySource: {
              root: { type: "external", identity: root.identity },
              instanceId: root.fragment.instances[0].id,
            },
          },
        ],
        authorizeAssetWrite,
      })
    ).rejects.toThrow("require transferred shell provenance");

    await expect(
      prepareMdxContentStorageWrites({
        loadedRoots: [root],
        changes: [
          {
            ...change,
            copySource: {
              root: {
                type: "external",
                identity: {
                  ...root.identity,
                  revision: "sha256:stale-source",
                },
              },
              instanceId: root.fragment.instances[0].id,
            },
          },
        ],
        authorizeAssetWrite,
      })
    ).rejects.toThrow("does not match its loaded Asset");

    await expect(
      prepareMdxContentStorageWrites({
        loadedRoots: [root],
        changes: [
          {
            ...change,
            copySource: {
              root: { type: "external", identity: root.identity },
              instanceId: "missing-source",
            },
          },
        ],
        authorizeAssetWrite,
      })
    ).rejects.toThrow('source instance "missing-source" is not loaded');
  });

  test("does not mistake an inserted element tree for a template copy", async () => {
    const root = await loadResolvedTemplate();

    const [write] = await prepareMdxContentStorageWrites({
      loadedRoots: [root],
      changes: [insertClonedTemplateExpansion(root)],
      authorizeAssetWrite,
    });

    expect(
      (await parseMdxDocument({ source: write.source })).children[1]
    ).toMatchObject({ type: "element", tag: "article" });
  });
});
