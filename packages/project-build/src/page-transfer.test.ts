import { expect, test, vi } from "vitest";
import { createDefaultPages } from "./index";
import {
  executePageTransfer,
  planPageTransfer,
  previewPageTransfer,
  projectPageCopyAssets,
  type PageTransferData,
} from "./transfer";
import {
  blockComponent,
  contentBlockSourceProp,
  createDefaultStructuredAssetQueryResourceConfiguration,
  createStructuredAssetQueryResourceBody,
  parseStructuredAssetQueryResourceBody,
  type Asset,
  type AssetFolder,
  type WebstudioFragment,
} from "@webstudio-is/sdk";

const image: Asset = {
  id: "source-image",
  projectId: "source",
  type: "image",
  name: "hero_storage.png",
  filename: "hero",
  size: 32,
  format: "png",
  createdAt: "2026-11-17T00:00:00.000Z",
  description: null,
  meta: { width: 10, height: 10 },
};
const fragment: WebstudioFragment = {
  children: [],
  instances: [],
  assets: [],
  dataSources: [],
  resources: [],
  props: [],
  breakpoints: [],
  styleSourceSelections: [],
  styleSources: [],
  styles: [],
};
const page = createDefaultPages({
  homePageId: "page",
  rootInstanceId: "root",
}).pages.get("page")!;
const item: PageTransferData = {
  type: "page",
  page: { ...page, meta: { ...page.meta, socialImageAssetId: image.id } },
  rootFragment: fragment,
  bodyFragment: { ...fragment, assets: [image] },
};
const fixture = {
  item,
  sameStorage: true,
  sameProject: false,
  hasRenderedScope: false,
  source: { assets: [image], folders: [] },
  target: { assets: [], folders: [] },
  targetProjectId: "destination",
  readDocument: async () => {
    throw new Error("Unexpected document read");
  },
};

test("a same-storage copy stages an alias with no binary upload", async () => {
  const plan = await planPageTransfer(fixture);
  const upload = vi.fn(async () => {
    throw new Error("Unexpected upload");
  });
  const relink = vi.fn(async (plans: typeof plan.assets) =>
    plans.map(({ target }) => target)
  );
  const result = await executePageTransfer({
    plan,
    createFolder: async () => {
      throw new Error("Unexpected folder");
    },
    stageAssets: (plans) =>
      projectPageCopyAssets({ plans, sameStorage: true, relink, upload }),
    readTarget: async () => ({
      assets: plan.assets.map(({ target }) => target),
      folders: [],
    }),
    commit: async (item) => ({
      pageId: item.page.id,
      imageId: item.page.meta.socialImageAssetId,
    }),
  });
  expect(result).toEqual({ pageId: "page", imageId: image.id });
  expect(relink).toHaveBeenCalledOnce();
  expect(upload).not.toHaveBeenCalled();
  expect(plan.assets[0].target).toMatchObject({
    id: image.id,
    projectId: "destination",
    name: image.name,
  });
});

test("a cross-storage copy points a literal Content Block source at the uploaded document", async () => {
  const sourceDocument: Asset = {
    ...image,
    id: "source-document",
    name: "article_storage.mdx",
    filename: "article",
    type: "file",
    format: "mdx",
    meta: {},
  };
  const source = {
    id: "block-source",
    instanceId: "block",
    name: contentBlockSourceProp,
    type: "expression" as const,
    value: JSON.stringify(sourceDocument.id),
  };
  const unrelated = { ...source, id: "image-source", instanceId: "image" };
  const plan = await planPageTransfer({
    ...fixture,
    item: {
      ...item,
      page,
      bodyFragment: {
        ...fragment,
        children: [
          { type: "id", value: "block" },
          { type: "id", value: "image" },
        ],
        instances: [
          {
            type: "instance",
            id: "block",
            component: blockComponent,
            children: [],
          },
          { type: "instance", id: "image", component: "Image", children: [] },
        ],
        assets: [sourceDocument],
        props: [source, unrelated],
      },
    },
    sameStorage: false,
    source: { assets: [sourceDocument], folders: [] },
    readDocument: async () => "# Article",
    createAssetId: () => "planned-document",
  });
  const uploaded = { ...plan.assets[0].target, id: "uploaded-document" };
  const result = await executePageTransfer({
    plan,
    createFolder: async () => {
      throw new Error("Unexpected folder");
    },
    stageAssets: async () => new Map([[sourceDocument.id, uploaded]]),
    readTarget: async () => ({ assets: [uploaded], folders: [] }),
    commit: async ({ page, bodyFragment }) => ({
      pageId: page.id,
      props: bodyFragment.props,
    }),
  });
  expect(result.props).toEqual([
    { ...source, value: JSON.stringify(uploaded.id) },
    unrelated,
  ]);
  expect(previewPageTransfer(plan).bodyFragment.props).toEqual([
    { ...source, value: '"planned-document"' },
    unrelated,
  ]);
});

test("a change to the destination asset catalog prevents page insertion", async () => {
  const plan = await planPageTransfer(fixture);
  const commit = vi.fn(async () => ({ pageId: "should-not-commit" }));
  await expect(
    executePageTransfer({
      plan,
      createFolder: async () => {
        throw new Error("Unexpected folder");
      },
      stageAssets: async (plans) =>
        new Map(plans.map(({ source, target }) => [source.id, target])),
      readTarget: async () => ({
        assets: [{ ...plan.assets[0].target, name: "changed.png" }],
        folders: [],
      }),
      commit,
    })
  ).rejects.toMatchObject({ code: "PAGE_COPY_STALE" });
  expect(commit).not.toHaveBeenCalled();
});

test("same-storage copying rejects an Asset ID collision that requires changing a JSON document", async () => {
  const document: Asset = {
    ...image,
    id: "document",
    name: "content_storage.json",
    filename: "content",
    type: "file",
    format: "json",
    meta: {},
  };
  const unrelated: Asset = {
    ...image,
    projectId: "destination",
    name: "other_storage.png",
    filename: "other",
  };
  await expect(
    planPageTransfer({
      ...fixture,
      item: { ...item, bodyFragment: { ...fragment, assets: [document] } },
      source: { assets: [image, document], folders: [] },
      target: { assets: [unrelated], folders: [] },
      readDocument: async () => JSON.stringify({ image: image.id }),
    })
  ).rejects.toMatchObject({ code: "PAGE_COPY_ASSET_CONFLICT" });
});

test("a normalized folder collision cannot silently change the canonical path", async () => {
  const folder = {
    id: "source-folder",
    projectId: "source",
    name: "Images",
    createdAt: image.createdAt,
  };
  const nested = { ...image, folderId: folder.id };
  await expect(
    planPageTransfer({
      ...fixture,
      item: { ...item, bodyFragment: { ...fragment, assets: [nested] } },
      source: { assets: [nested], folders: [folder] },
      target: {
        assets: [],
        folders: [
          {
            ...folder,
            id: "target-folder",
            projectId: "destination",
            name: "images",
          },
        ],
      },
    })
  ).rejects.toMatchObject({ code: "PAGE_COPY_ASSET_CONFLICT" });
});

test("cross-storage copies include and remap assets selected by a fixed Assets query", async () => {
  const folder = {
    id: "source-folder",
    projectId: "source",
    name: "Gallery",
    createdAt: image.createdAt,
  };
  const queriedAsset: Asset = {
    ...image,
    id: "query-image",
    folderId: folder.id,
    name: "gallery_storage.png",
    filename: "gallery",
  };
  const configuration =
    createDefaultStructuredAssetQueryResourceConfiguration();
  const resource = {
    id: "gallery-resource",
    name: "Gallery assets",
    control: "system" as const,
    method: "post" as const,
    url: '"/$resources/assets"',
    headers: [],
    body: createStructuredAssetQueryResourceBody({
      ...configuration,
      where: {
        all: [
          {
            field: ["id"],
            operator: "eq",
            value: JSON.stringify(queriedAsset.id),
          },
          {
            field: ["folderId"],
            operator: "eq",
            value: JSON.stringify(folder.id),
          },
          {
            field: ["name"],
            operator: "eq",
            value: JSON.stringify("gallery.png"),
          },
        ],
      },
    }),
  };
  const plan = await planPageTransfer({
    ...fixture,
    item: {
      ...item,
      bodyFragment: { ...fragment, resources: [resource] },
    },
    sameStorage: false,
    source: { assets: [image, queriedAsset], folders: [folder] },
    target: {
      assets: [
        {
          ...image,
          id: "unrelated-target-image",
          projectId: "destination",
          folderId: "target-folder",
          name: "other_storage.png",
          filename: "other",
        },
      ],
      folders: [
        {
          ...folder,
          id: "target-folder",
          projectId: "destination",
        },
      ],
    },
  });

  expect(plan.assets.map(({ source }) => source.id)).toContain(queriedAsset.id);
  const preview = previewPageTransfer(plan);
  const query = parseStructuredAssetQueryResourceBody(
    preview.bodyFragment.resources[0].body
  );
  expect(query?.where).toEqual({
    field: ["id"],
    operator: "eq",
    value: JSON.stringify(
      plan.assets.find(({ source }) => source.id === queriedAsset.id)?.target.id
    ),
  });
});

test.each([
  { field: "folderId", stagedIds: new Map() },
  {
    field: "size",
    stagedIds: new Map([
      ["a-source", "z-target"],
      ["b-source", "a-target"],
    ]),
  },
] as const)(
  "cross-storage copies reject changed fixed-query order when sorted by $field",
  async ({ field, stagedIds }) => {
    const firstFolder = {
      id: "a-source-folder",
      projectId: "source",
      name: "First",
      createdAt: image.createdAt,
    };
    const secondFolder = {
      ...firstFolder,
      id: "b-source-folder",
      name: "Second",
    };
    const first: Asset = {
      ...image,
      id: "a-source",
      name: "first_storage.png",
      filename: "first",
      folderId: firstFolder.id,
    };
    const second: Asset = {
      ...image,
      id: "b-source",
      name: "second_storage.png",
      filename: "second",
      folderId: secondFolder.id,
    };
    const configuration =
      createDefaultStructuredAssetQueryResourceConfiguration();
    const resource = {
      id: "ordered-gallery-resource",
      name: "Ordered gallery assets",
      control: "system" as const,
      method: "post" as const,
      url: '"/$resources/assets"',
      headers: [],
      body: createStructuredAssetQueryResourceBody({
        ...configuration,
        where: {
          field: ["id"],
          operator: "in",
          value: JSON.stringify([first.id, second.id]),
        },
        sort: [{ field: [field], direction: "asc" }],
      }),
    };

    const plan = await planPageTransfer({
      ...fixture,
      item: {
        ...item,
        page: {
          ...item.page,
          meta: { ...item.page.meta, socialImageAssetId: undefined },
        },
        bodyFragment: { ...fragment, resources: [resource] },
      },
      sameStorage: false,
      source: {
        assets: [first, second],
        folders: [firstFolder, secondFolder],
      },
      createAssetId: (() => {
        const ids = [
          "planned-first-folder",
          "planned-first-asset",
          "planned-second-folder",
          "planned-second-asset",
        ];
        return () => ids.shift()!;
      })(),
    });
    const commit = vi.fn(async (item: PageTransferData) => ({
      pageId: item.page.id,
    }));
    let stagedAssets: Asset[] = [];
    const actualFolders: AssetFolder[] = [];
    const transfer = executePageTransfer({
      plan,
      createFolder: async (folder) => {
        const created = {
          ...folder,
          id: folder.name === "First" ? "z-folder" : "a-folder",
        };
        actualFolders.push(created);
        return created;
      },
      stageAssets: async (plans) => {
        const staged = plans.map(
          ({ source, target }) =>
            [
              source.id,
              { ...target, id: stagedIds.get(source.id) ?? target.id },
            ] as const
        );
        stagedAssets = staged.map(([, asset]) => asset);
        return new Map(staged);
      },
      readTarget: async () => ({
        assets: stagedAssets,
        folders: actualFolders,
      }),
      commit,
    });

    await expect(transfer).rejects.toMatchObject({
      code: "PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED",
    });
    expect(commit).not.toHaveBeenCalled();
  }
);

test("same-storage copies preserve fixed-query order by Markdown properties", async () => {
  const first: Asset = {
    ...image,
    id: "a-source",
    name: "first_storage.png",
    filename: "first",
    type: "file",
    format: "md",
    meta: {},
  };
  const second: Asset = {
    ...image,
    id: "b-source",
    name: "second_storage.png",
    filename: "second",
    type: "file",
    format: "md",
    meta: {},
  };
  const targetAssets = [
    { ...first, id: "z-target", projectId: "destination" },
    { ...second, id: "a-target", projectId: "destination" },
  ];
  const configuration =
    createDefaultStructuredAssetQueryResourceConfiguration();
  const resource = {
    id: "ordered-gallery-resource",
    name: "Ordered gallery assets",
    control: "system" as const,
    method: "post" as const,
    url: '"/$resources/assets"',
    headers: [],
    body: createStructuredAssetQueryResourceBody({
      ...configuration,
      where: {
        field: ["id"],
        operator: "in",
        value: JSON.stringify([first.id, second.id]),
      },
      sort: [{ field: ["properties", "title"], direction: "asc" }],
    }),
  };

  const plan = await planPageTransfer({
    ...fixture,
    item: {
      ...item,
      page: {
        ...item.page,
        meta: { ...item.page.meta, socialImageAssetId: undefined },
      },
      bodyFragment: { ...fragment, resources: [resource] },
    },
    source: { assets: [first, second], folders: [] },
    target: { assets: targetAssets, folders: [] },
    readDocument: async (asset) =>
      asset.id === first.id
        ? "---\ntitle: Alpha\n---\n"
        : "---\ntitle: Beta\n---\n",
  });
  const commit = vi.fn(async (item: PageTransferData) => ({
    pageId: item.page.id,
  }));
  const result = await executePageTransfer({
    plan,
    createFolder: async () => {
      throw new Error("Unexpected folder");
    },
    stageAssets: async (plans) =>
      new Map(plans.map(({ source, target }) => [source.id, target])),
    readTarget: async () => ({ assets: targetAssets, folders: [] }),
    commit,
  });
  expect(result.pageId).toBe(item.page.id);
  expect(commit).toHaveBeenCalledOnce();
});

test("same-storage JSON property limits use the runtime query fallback", async () => {
  const first: Asset = {
    ...image,
    id: "a-source",
    name: "first_storage.json",
    filename: "first",
    type: "file",
    format: "json",
    meta: {},
  };
  const second: Asset = {
    ...first,
    id: "b-source",
    name: "second_storage.json",
    filename: "second",
  };
  const targetAssets = [
    { ...first, id: "z-target", projectId: "destination" },
    { ...second, id: "a-target", projectId: "destination" },
  ];
  const configuration =
    createDefaultStructuredAssetQueryResourceConfiguration();
  const resource = {
    id: "ordered-json-resource",
    name: "Ordered JSON assets",
    control: "system" as const,
    method: "post" as const,
    url: '"/$resources/assets"',
    headers: [],
    body: createStructuredAssetQueryResourceBody({
      ...configuration,
      where: {
        field: ["id"],
        operator: "in",
        value: JSON.stringify([first.id, second.id]),
      },
      sort: [{ field: ["properties", "title"], direction: "asc" }],
    }),
  };
  const plan = await planPageTransfer({
    ...fixture,
    item: {
      ...item,
      page: {
        ...item.page,
        meta: { ...item.page.meta, socialImageAssetId: undefined },
      },
      bodyFragment: { ...fragment, resources: [resource] },
    },
    source: { assets: [first, second], folders: [] },
    target: { assets: targetAssets, folders: [] },
    readDocument: async () =>
      JSON.stringify(
        Object.fromEntries(
          Array.from({ length: 257 }, (_, index) => [`field${index}`, index])
        )
      ),
  });

  await expect(
    executePageTransfer({
      plan,
      createFolder: async () => {
        throw new Error("Unexpected folder");
      },
      stageAssets: async (plans) =>
        new Map(plans.map(({ source, target }) => [source.id, target])),
      readTarget: async () => ({ assets: targetAssets, folders: [] }),
      commit: vi.fn(async (item: PageTransferData) => ({
        pageId: item.page.id,
      })),
    })
  ).rejects.toMatchObject({
    code: "PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED",
  });
});

test("cross-storage copies reject Assets queries with empty nested filters", async () => {
  const configuration =
    createDefaultStructuredAssetQueryResourceConfiguration();
  const resource = {
    id: "dynamic-gallery-resource",
    name: "Dynamic gallery assets",
    control: "system" as const,
    method: "post" as const,
    url: '"/$resources/assets"',
    headers: [],
    body: createStructuredAssetQueryResourceBody({
      ...configuration,
      where: {
        any: [
          {
            all: [],
          },
          {
            field: ["id"],
            operator: "eq",
            value: JSON.stringify(image.id),
          },
        ],
      },
    }),
  };

  await expect(
    planPageTransfer({
      ...fixture,
      item: {
        ...item,
        bodyFragment: { ...fragment, resources: [resource] },
      },
    })
  ).rejects.toMatchObject({ code: "PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED" });
});

test("cross-storage copies reject dynamic Assets query filters", async () => {
  const configuration =
    createDefaultStructuredAssetQueryResourceConfiguration();
  const resource = {
    id: "dynamic-gallery-resource",
    name: "Dynamic gallery assets",
    control: "system" as const,
    method: "post" as const,
    url: '"/$resources/assets"',
    headers: [],
    body: createStructuredAssetQueryResourceBody({
      ...configuration,
      where: {
        any: [
          {
            field: ["id"],
            operator: "eq",
            value: JSON.stringify(image.id),
          },
          {
            field: ["name"],
            operator: "eq",
            value: "$ws$dataSource$assetName",
          },
        ],
      },
    }),
  };

  await expect(
    planPageTransfer({
      ...fixture,
      item: {
        ...item,
        bodyFragment: { ...fragment, resources: [resource] },
      },
    })
  ).rejects.toMatchObject({ code: "PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED" });
});

test.each(["first", "last"] as const)(
  "cross-storage copies reject ambiguous %s Assets queries",
  async (result) => {
    const folder = {
      id: "source-folder",
      projectId: "source",
      name: "Gallery",
      createdAt: image.createdAt,
    };
    const configuration =
      createDefaultStructuredAssetQueryResourceConfiguration();
    const resource = {
      id: "ambiguous-resource",
      name: "Ambiguous assets",
      control: "system" as const,
      method: "post" as const,
      url: '"/$resources/assets"',
      headers: [],
      body: createStructuredAssetQueryResourceBody({
        ...configuration,
        result,
        where: {
          field: ["folderId"],
          operator: "eq",
          value: JSON.stringify(folder.id),
        },
      }),
    };
    const assets = [
      {
        ...image,
        id: "first-image",
        name: "first_storage.png",
        filename: "first",
        folderId: folder.id,
      },
      {
        ...image,
        id: "second-image",
        name: "second_storage.png",
        filename: "second",
        folderId: folder.id,
      },
    ];

    await expect(
      planPageTransfer({
        ...fixture,
        item: {
          ...item,
          bodyFragment: { ...fragment, resources: [resource] },
        },
        source: { assets, folders: [folder] },
      })
    ).rejects.toMatchObject({
      code: "PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED",
    });
  }
);

test("copied queries replace their filters instead of exceeding the filter limit", async () => {
  const configuration =
    createDefaultStructuredAssetQueryResourceConfiguration();
  const resource = {
    id: "full-filter-resource",
    name: "Filtered assets",
    control: "system" as const,
    method: "post" as const,
    url: '"/$resources/assets"',
    headers: [],
    body: createStructuredAssetQueryResourceBody({
      ...configuration,
      where: {
        all: Array.from({ length: 32 }, () => ({
          field: ["id"],
          operator: "eq",
          value: JSON.stringify(image.id),
        })),
      },
    }),
  };
  const plan = await planPageTransfer({
    ...fixture,
    item: {
      ...item,
      bodyFragment: { ...fragment, resources: [resource] },
    },
  });
  const query = parseStructuredAssetQueryResourceBody(
    previewPageTransfer(plan).bodyFragment.resources[0].body
  );

  expect(query?.where).toEqual({
    field: ["id"],
    operator: "eq",
    value: JSON.stringify(plan.assets[0].target.id),
  });
});

test("dynamic Content Blocks only transfer direct asset ID paths from fixed queries", async () => {
  const document: Asset = {
    ...image,
    id: "queryDocument",
    type: "file",
    name: "document_storage.md",
    filename: "document",
    format: "md",
    meta: {},
  };
  const configuration =
    createDefaultStructuredAssetQueryResourceConfiguration();
  const resource = {
    id: "documents-resource",
    name: "Documents",
    control: "system" as const,
    method: "post" as const,
    url: '"/$resources/assets"',
    headers: [],
    body: createStructuredAssetQueryResourceBody({
      ...configuration,
      result: "one",
      where: {
        all: [
          {
            field: ["id"],
            operator: "eq",
            value: JSON.stringify(document.id),
          },
        ],
      },
    }),
  };
  const blockFragment = (source: string): WebstudioFragment => ({
    ...fragment,
    children: [{ type: "id", value: "block" }],
    instances: [
      { type: "instance", id: "block", component: "ws:block", children: [] },
    ],
    props: [
      {
        id: "block-source",
        instanceId: "block",
        name: "src",
        type: "expression",
        value: source,
      },
      {
        id: "query-meta-use",
        instanceId: "block",
        name: "title",
        type: "expression",
        value: "$ws$dataSource$queryData.meta.totalCount > 0",
      },
      {
        id: "query-condition-only-use",
        instanceId: "block",
        name: "title",
        type: "expression",
        value: "($ws$dataSource$queryData.data ? labels : defaults)[language]",
      },
    ],
    dataSources: [
      {
        id: "queryData",
        type: "resource",
        name: "Documents",
        resourceId: resource.id,
        scopeInstanceId: "block",
      },
    ],
    resources: [resource],
  });
  const plan = (source: string) =>
    planPageTransfer({
      ...fixture,
      item: {
        ...item,
        bodyFragment: blockFragment(source),
      },
      sameStorage: false,
      source: { assets: [image, document], folders: [] },
      readDocument: async () => "A copied document.",
    });
  const collectionResource = {
    ...resource,
    body: createStructuredAssetQueryResourceBody({
      ...configuration,
      output: { mode: "all", includeMetadata: true },
      where: {
        field: ["id"],
        operator: "eq",
        value: JSON.stringify(document.id),
      },
    }),
  };
  const collectionFragment: WebstudioFragment = {
    ...fragment,
    children: [{ type: "id", value: "collection" }],
    instances: [
      {
        type: "instance",
        id: "collection",
        component: "ws:collection",
        children: [{ type: "id", value: "block" }],
      },
      {
        type: "instance",
        id: "block",
        component: "ws:block",
        children: [],
      },
    ],
    props: [
      {
        id: "block-source",
        instanceId: "block",
        name: "src",
        type: "expression",
        value: "$ws$dataSource$item.id",
      },
      {
        id: "collection-data",
        instanceId: "collection",
        name: "data",
        type: "expression",
        value: "$ws$dataSource$queryData.data",
      },
      {
        id: "collection-item",
        instanceId: "collection",
        name: "item",
        type: "parameter",
        value: "item",
      },
    ],
    dataSources: [
      {
        id: "queryData",
        type: "resource",
        name: "Documents",
        resourceId: resource.id,
        scopeInstanceId: "collection",
      },
      {
        id: "item",
        type: "parameter",
        name: "collectionItem",
        scopeInstanceId: "collection",
      },
    ],
    resources: [collectionResource],
  };

  await expect(
    plan('$ws$dataSource$queryData ? "uncopied-a" : "uncopied-b"')
  ).rejects.toMatchObject({ code: "PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED" });
  await expect(
    plan("$ws$dataSource$queryData.data.description")
  ).rejects.toMatchObject({ code: "PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED" });

  const directPlan = await plan("$ws$dataSource$queryData.data.id");
  expect(directPlan.assets.map(({ source }) => source.id)).toContain(
    document.id
  );

  const collectionPlan = await planPageTransfer({
    ...fixture,
    item: { ...item, bodyFragment: collectionFragment },
    sameStorage: false,
    source: { assets: [image, document], folders: [] },
    readDocument: async () => "A copied document.",
  });
  expect(collectionPlan.assets.map(({ source }) => source.id)).toContain(
    document.id
  );

  const itemKeyCollectionFragment: WebstudioFragment = {
    ...collectionFragment,
    props: [
      ...collectionFragment.props.filter(
        (prop) => prop.id !== "collection-item"
      ),
      {
        id: "collection-item-key",
        instanceId: "collection",
        name: "itemKey",
        type: "parameter",
        value: "itemKey",
      },
      {
        id: "block-source",
        instanceId: "block",
        name: "src",
        type: "expression",
        value: "$ws$dataSource$itemKey",
      },
    ],
    dataSources: [
      ...collectionFragment.dataSources
        .filter((dataSource) => dataSource.id !== "item")
        .map((dataSource) =>
          dataSource.id === "queryData"
            ? { ...dataSource, scopeInstanceId: "page-body" }
            : dataSource
        ),
      {
        id: "itemKey",
        type: "parameter",
        name: "collectionItemKey",
        scopeInstanceId: "collection",
      },
    ],
    resources: [
      {
        ...collectionResource,
        body: createStructuredAssetQueryResourceBody({
          ...configuration,
          where: {
            field: ["id"],
            operator: "eq",
            value: JSON.stringify(document.id),
          },
        }),
      },
    ],
  };
  const itemKeyPlan = await planPageTransfer({
    ...fixture,
    item: { ...item, bodyFragment: itemKeyCollectionFragment },
    sameStorage: false,
    source: { assets: [image, document], folders: [] },
    readDocument: async () => "A copied document.",
  });
  expect(itemKeyPlan.assets.map(({ source }) => source.id)).toContain(
    document.id
  );

  const fallbackCollectionFragment = {
    ...itemKeyCollectionFragment,
    props: [
      ...itemKeyCollectionFragment.props.filter(
        (prop) => prop.id !== "collection-data" && prop.id !== "block-source"
      ),
      {
        id: "collection-data",
        instanceId: "collection",
        name: "data",
        type: "expression" as const,
        value: "($ws$dataSource$queryData ?? fallback).data",
      },
      {
        id: "block-source",
        instanceId: "block",
        name: "src",
        type: "expression" as const,
        value: '"static-source"',
      },
    ],
  };
  await expect(
    planPageTransfer({
      ...fixture,
      item: { ...item, bodyFragment: fallbackCollectionFragment },
      sameStorage: false,
      source: { assets: [image, document], folders: [] },
      readDocument: async () => "A copied document.",
    })
  ).resolves.toBeDefined();

  const itemKeyComparisonFragment = {
    ...fallbackCollectionFragment,
    props: [
      ...fallbackCollectionFragment.props,
      {
        id: "compare-item-key",
        instanceId: "collection",
        name: "data-active",
        type: "expression" as const,
        value: `$ws$dataSource$itemKey === "${document.id}"`,
      },
    ],
  };
  await expect(
    planPageTransfer({
      ...fixture,
      item: { ...item, bodyFragment: itemKeyComparisonFragment },
      sameStorage: false,
      source: { assets: [image, document], folders: [] },
      readDocument: async () => "A copied document.",
    })
  ).rejects.toMatchObject({ code: "PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED" });

  const computedCollectionFragment = {
    ...fallbackCollectionFragment,
    props: [
      ...fallbackCollectionFragment.props.filter(
        (prop) => prop.id !== "collection-data"
      ),
      {
        id: "collection-data",
        instanceId: "collection",
        name: "data",
        type: "expression" as const,
        value: "$ws$dataSource$queryData[field]",
      },
      {
        id: "compare-computed-item-key",
        instanceId: "collection",
        name: "data-active",
        type: "expression" as const,
        value: `$ws$dataSource$itemKey === "${document.id}"`,
      },
    ],
  };
  await expect(
    planPageTransfer({
      ...fixture,
      item: { ...item, bodyFragment: computedCollectionFragment },
      sameStorage: false,
      source: { assets: [image, document], folders: [] },
      readDocument: async () => "A copied document.",
    })
  ).rejects.toMatchObject({ code: "PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED" });

  const noIdResource = {
    ...collectionResource,
    id: "no-id-resource",
    body: createStructuredAssetQueryResourceBody({
      ...configuration,
      output: { mode: "fields", includeMetadata: false, fields: [["url"]] },
      result: "many",
      where: {
        field: ["id"],
        operator: "eq",
        value: JSON.stringify(image.id),
      },
    }),
  };
  const mixedProjectionFragment: WebstudioFragment = {
    ...itemKeyCollectionFragment,
    props: [
      ...itemKeyCollectionFragment.props.filter(
        (prop) =>
          prop.id !== "collection-data" &&
          prop.id !== "collection-item-key" &&
          prop.id !== "block-source"
      ),
      {
        id: "collection-data",
        instanceId: "collection",
        name: "data",
        type: "expression",
        value:
          "condition ? $ws$dataSource$queryData.data : $ws$dataSource$otherQuery.data",
      },
      {
        id: "collection-item",
        instanceId: "collection",
        name: "item",
        type: "parameter",
        value: "item",
      },
      {
        id: "block-source",
        instanceId: "block",
        name: "src",
        type: "expression",
        value: '"static-source"',
      },
      {
        id: "compare-mixed-query-id",
        instanceId: "collection",
        name: "data-active",
        type: "expression",
        value: `$ws$dataSource$item.id === "${document.id}"`,
      },
    ],
    dataSources: [
      ...itemKeyCollectionFragment.dataSources.filter(
        (dataSource) => dataSource.id !== "itemKey"
      ),
      {
        id: "item",
        type: "parameter",
        name: "collectionItem",
        scopeInstanceId: "collection",
      },
      {
        id: "otherQuery",
        type: "resource",
        name: "Other documents",
        resourceId: noIdResource.id,
        scopeInstanceId: "page-body",
      },
    ],
    resources: [collectionResource, noIdResource],
  };
  await expect(
    planPageTransfer({
      ...fixture,
      item: { ...item, bodyFragment: mixedProjectionFragment },
      sameStorage: false,
      source: { assets: [image, document], folders: [] },
      readDocument: async () => "A copied document.",
    })
  ).rejects.toMatchObject({ code: "PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED" });

  const saveItemKeyFragment = {
    ...itemKeyCollectionFragment,
    props: [
      ...itemKeyCollectionFragment.props,
      {
        id: "save-item-key",
        instanceId: "block",
        name: "onClick",
        type: "action" as const,
        value: [
          {
            type: "execute" as const,
            args: [],
            code: "selected = $ws$dataSource$itemKey;",
          },
        ],
      },
    ],
  };
  await expect(
    planPageTransfer({
      ...fixture,
      item: { ...item, bodyFragment: saveItemKeyFragment },
      sameStorage: false,
      source: { assets: [image, document], folders: [] },
      readDocument: async () => "A copied document.",
    })
  ).resolves.toBeDefined();

  const itemKeyMembershipFragment = {
    ...itemKeyCollectionFragment,
    props: [
      ...itemKeyCollectionFragment.props,
      {
        id: "item-key-membership",
        instanceId: "collection",
        name: "data-active",
        type: "expression" as const,
        value: `[
          "${document.id}",
          "${image.id}",
        ].includes($ws$dataSource$itemKey)`,
      },
    ],
  };
  await expect(
    planPageTransfer({
      ...fixture,
      item: { ...item, bodyFragment: itemKeyMembershipFragment },
      sameStorage: false,
      source: { assets: [image, document], folders: [] },
      readDocument: async () => "A copied document.",
    })
  ).rejects.toMatchObject({ code: "PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED" });

  const singleIdComparisonFragment = blockFragment(
    "$ws$dataSource$queryData.data.id"
  );
  singleIdComparisonFragment.props.push({
    id: "compare-single-id",
    instanceId: "block",
    name: "title",
    type: "expression",
    value: `$ws$dataSource$queryData.data.id === "${document.id}"`,
  });
  await expect(
    planPageTransfer({
      ...fixture,
      item: { ...item, bodyFragment: singleIdComparisonFragment },
      sameStorage: false,
      source: { assets: [image, document], folders: [] },
      readDocument: async () => "A copied document.",
    })
  ).rejects.toMatchObject({ code: "PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED" });

  const staticBlockWithManyQuery = () => {
    const result = blockFragment("$ws$dataSource$queryData.data.id");
    result.props = [
      ...result.props.filter((prop) => prop.id !== "block-source"),
      {
        id: "block-source",
        instanceId: "block",
        name: "src",
        type: "string",
        value: document.id,
      },
    ];
    result.resources = [collectionResource];
    return result;
  };
  const unsafeConsumerFragment = staticBlockWithManyQuery();
  unsafeConsumerFragment.props.push({
    id: "stale-map-lookup",
    instanceId: "block",
    name: "title",
    type: "expression",
    value: '$ws$dataSource$queryData.data["queryDocument"].name',
  });
  await expect(
    planPageTransfer({
      ...fixture,
      item: { ...item, bodyFragment: unsafeConsumerFragment },
      sameStorage: false,
      source: { assets: [image, document], folders: [] },
      readDocument: async () => "A copied document.",
    })
  ).rejects.toMatchObject({ code: "PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED" });

  const dotLookupFragment = staticBlockWithManyQuery();
  dotLookupFragment.props.push({
    id: "stale-dot-lookup",
    instanceId: "block",
    name: "title",
    type: "expression",
    value: "$ws$dataSource$queryData.data.queryDocument.name",
  });
  await expect(
    planPageTransfer({
      ...fixture,
      item: { ...item, bodyFragment: dotLookupFragment },
      sameStorage: false,
      source: { assets: [image, document], folders: [] },
      readDocument: async () => "A copied document.",
    })
  ).rejects.toMatchObject({ code: "PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED" });

  const dynamicFieldLookupFragment = staticBlockWithManyQuery();
  dynamicFieldLookupFragment.instances[0].children = [
    {
      type: "expression",
      value: '$ws$dataSource$queryData[field]["queryDocument"].url',
    },
  ];
  await expect(
    planPageTransfer({
      ...fixture,
      item: { ...item, bodyFragment: dynamicFieldLookupFragment },
      sameStorage: false,
      source: { assets: [image, document], folders: [] },
      readDocument: async () => "A copied document.",
    })
  ).rejects.toMatchObject({ code: "PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED" });

  const staleTextFragment = staticBlockWithManyQuery();
  staleTextFragment.instances[0].children = [
    {
      type: "expression",
      value: "$ws$dataSource$queryData.data.queryDocument.name",
    },
  ];
  await expect(
    planPageTransfer({
      ...fixture,
      item: { ...item, bodyFragment: staleTextFragment },
      sameStorage: false,
      source: { assets: [image, document], folders: [] },
      readDocument: async () => "A copied document.",
    })
  ).rejects.toMatchObject({ code: "PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED" });

  const requestBodyFragment = staticBlockWithManyQuery();
  requestBodyFragment.resources.push({
    id: "request-resource",
    name: "Request",
    control: "system",
    method: "post",
    url: '"https://example.com"',
    headers: [],
    body: '{ photo: $ws$dataSource$queryData.data["queryDocument"].url, count: 1 }',
  });
  await expect(
    planPageTransfer({
      ...fixture,
      item: { ...item, bodyFragment: requestBodyFragment },
      sameStorage: false,
      source: { assets: [image, document], folders: [] },
      readDocument: async () => "A copied document.",
    })
  ).rejects.toMatchObject({ code: "PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED" });

  const actionFragment = staticBlockWithManyQuery();
  actionFragment.props.push({
    id: "stale-action-lookup",
    instanceId: "block",
    name: "onClick",
    type: "action",
    value: [
      {
        type: "execute",
        args: [],
        code: 'selected = $ws$dataSource$queryData.data; selected["queryDocument"].url',
      },
    ],
  });
  await expect(
    planPageTransfer({
      ...fixture,
      item: { ...item, bodyFragment: actionFragment },
      sameStorage: false,
      source: { assets: [image, document], folders: [] },
      readDocument: async () => "A copied document.",
    })
  ).rejects.toMatchObject({ code: "PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED" });

  for (const code of [
    "state = { photos: $ws$dataSource$queryData.data };",
    "selected = $ws$dataSource$queryData;",
  ]) {
    const wrappedMapFragment = staticBlockWithManyQuery();
    wrappedMapFragment.props.push({
      id: "wrapped-map-action",
      instanceId: "block",
      name: "onClick",
      type: "action",
      value: [{ type: "execute", args: [], code }],
    });
    await expect(
      planPageTransfer({
        ...fixture,
        item: { ...item, bodyFragment: wrappedMapFragment },
        sameStorage: false,
        source: { assets: [image, document], folders: [] },
        readDocument: async () => "A copied document.",
      })
    ).rejects.toMatchObject({
      code: "PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED",
    });
  }

  const fallbackFragment = staticBlockWithManyQuery();
  fallbackFragment.instances[0].children = [
    {
      type: "expression",
      value: '($ws$dataSource$queryData.data ?? {})["queryDocument"].url',
    },
  ];
  await expect(
    planPageTransfer({
      ...fixture,
      item: { ...item, bodyFragment: fallbackFragment },
      sameStorage: false,
      source: { assets: [image, document], folders: [] },
      readDocument: async () => "A copied document.",
    })
  ).rejects.toMatchObject({ code: "PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED" });

  const unrelatedFallbackKeyFragment = staticBlockWithManyQuery();
  unrelatedFallbackKeyFragment.instances[0].children = [
    {
      type: "expression",
      value: `($ws$dataSource$queryData ?? {}).data["${image.id}"].url`,
    },
  ];
  await expect(
    planPageTransfer({
      ...fixture,
      item: { ...item, bodyFragment: unrelatedFallbackKeyFragment },
      sameStorage: false,
      source: { assets: [image, document], folders: [] },
      readDocument: async () => "A copied document.",
    })
  ).resolves.toBeDefined();

  const resourceFallbackFragment = staticBlockWithManyQuery();
  resourceFallbackFragment.instances[0].children = [
    {
      type: "expression",
      value: '($ws$dataSource$queryData ?? {}).data["queryDocument"].url',
    },
  ];
  await expect(
    planPageTransfer({
      ...fixture,
      item: { ...item, bodyFragment: resourceFallbackFragment },
      sameStorage: false,
      source: { assets: [image, document], folders: [] },
      readDocument: async () => "A copied document.",
    })
  ).rejects.toMatchObject({ code: "PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED" });

  const assignedResourceFallbackFragment = staticBlockWithManyQuery();
  assignedResourceFallbackFragment.props.push({
    id: "assigned-resource-fallback",
    instanceId: "block",
    name: "onClick",
    type: "action",
    value: [
      {
        type: "execute",
        args: [],
        code: 'selected = ($ws$dataSource$queryData ?? {}).data; selected["queryDocument"].url',
      },
    ],
  });
  await expect(
    planPageTransfer({
      ...fixture,
      item: { ...item, bodyFragment: assignedResourceFallbackFragment },
      sameStorage: false,
      source: { assets: [image, document], folders: [] },
      readDocument: async () => "A copied document.",
    })
  ).rejects.toMatchObject({ code: "PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED" });

  const scalarResourceActionFragment = staticBlockWithManyQuery();
  scalarResourceActionFragment.props.push({
    id: "scalar-resource-action",
    instanceId: "block",
    name: "onClick",
    type: "action",
    value: [
      {
        type: "execute",
        args: [],
        code: "isLoaded = !!$ws$dataSource$queryData.data;",
      },
    ],
  });
  await expect(
    planPageTransfer({
      ...fixture,
      item: { ...item, bodyFragment: scalarResourceActionFragment },
      sameStorage: false,
      source: { assets: [image, document], folders: [] },
      readDocument: async () => "A copied document.",
    })
  ).resolves.toBeDefined();

  await expect(
    planPageTransfer({
      ...fixture,
      item: {
        ...item,
        page: {
          ...item.page,
          meta: {
            ...item.page.meta,
            description: '$ws$dataSource$queryData.data["queryDocument"].name',
          },
        },
        bodyFragment: staticBlockWithManyQuery(),
      },
      sameStorage: false,
      source: { assets: [image, document], folders: [] },
      readDocument: async () => "A copied document.",
    })
  ).rejects.toMatchObject({ code: "PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED" });
});
