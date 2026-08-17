import { describe, expect, test } from "vitest";
import {
  parseMdxDocument,
  serializeMdxDocument,
} from "@webstudio-is/content-engine/mdx";
import {
  blockComponent,
  blockTemplateComponent,
  encodeDataVariableId,
  type Asset,
  type ContentBlockExternalContentIdentity,
  type Instance,
  type Prop,
  type WebstudioData,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
import {
  materializeMdxTemplates,
  type MaterializedMdxTemplate,
} from "./mdx-materialization";
import {
  resolveMdxTemplates,
  type MdxTemplateResolution,
} from "./mdx-template-resolution";

const identity: ContentBlockExternalContentIdentity = {
  blockInstanceId: "block",
  assetId: "article",
  revision: "revision-1",
  contentRef: "articles/hello.mdx",
  format: "mdx",
  renderScope: "route:/hello",
};

const resolution: MdxTemplateResolution = {
  templateNames: ["Hero Card"],
  references: [
    {
      type: "resolved-template",
      path: [0],
      templateName: "Hero Card",
      props: [],
      templateInstanceId: "hero",
    },
    {
      type: "unresolved-template",
      path: [1],
      templateName: "Missing",
    },
  ],
  diagnostics: [
    {
      code: "unresolved-template",
      severity: "warning",
      blockInstanceId: "block",
      assetId: "article",
      contentRef: "articles/hello.mdx",
      renderScope: "route:/hello",
      templateName: "Missing",
    },
  ],
};

const metas = new Map<string, WsComponentMeta>([
  [
    "Card",
    {
      props: {
        tone: {
          type: "string",
          control: "text",
          required: false,
          contentMode: true,
        },
        featured: {
          type: "boolean",
          control: "boolean",
          required: false,
          contentMode: true,
        },
        title: {
          type: "string",
          control: "text",
          required: false,
          contentMode: true,
        },
        count: {
          type: "number",
          control: "number",
          required: false,
          contentMode: true,
        },
        layout: {
          type: "string",
          control: "text",
          required: false,
        },
      },
    },
  ],
]);

const createData = (): Omit<WebstudioData, "pages"> => {
  const hero: Instance = {
    type: "instance",
    id: "hero",
    component: "Card",
    children: [{ type: "id", value: "heading" }],
  };
  const heading: Instance = {
    type: "instance",
    id: "heading",
    component: "ws:element",
    tag: "h2",
    children: [{ type: "text", value: "Template title" }],
  };
  const prop: Prop = {
    id: "hero:tone",
    instanceId: "hero",
    name: "tone",
    type: "string",
    value: "strong",
  };
  const duplicateToneProp: Prop = {
    ...prop,
    id: "hero:tone-duplicate",
    value: "duplicate",
  };
  const imageProp: Prop = {
    id: "hero:image",
    instanceId: "hero",
    name: "image",
    type: "asset",
    value: "image",
  };
  const expressionProp: Prop = {
    id: "hero:title",
    instanceId: "hero",
    name: "title",
    type: "expression",
    value: encodeDataVariableId("site-title"),
  };
  const countProp: Prop = {
    id: "hero:count",
    instanceId: "hero",
    name: "count",
    type: "number",
    value: 1,
  };
  const layoutProp: Prop = {
    id: "hero:layout",
    instanceId: "hero",
    name: "layout",
    type: "string",
    value: "contained",
  };
  const legacyProp: Prop = {
    id: "hero:legacy",
    instanceId: "hero",
    name: "legacy",
    type: "string",
    value: "Template legacy",
  };
  const asset: Asset = {
    id: "image",
    projectId: "source-project",
    name: "hero.png",
    type: "image",
    format: "png",
    size: 100,
    meta: { width: 10, height: 10 },
    createdAt: "2026-01-01T00:00:00.000Z",
  };
  return {
    instances: new Map([
      [
        "block",
        {
          type: "instance",
          id: "block",
          component: blockComponent,
          children: [{ type: "id", value: "templates" }],
        },
      ],
      [
        "templates",
        {
          type: "instance",
          id: "templates",
          component: blockTemplateComponent,
          children: [{ type: "id", value: hero.id }],
        },
      ],
      [hero.id, hero],
      [heading.id, heading],
    ]),
    props: new Map<Prop["id"], Prop>([
      [prop.id, prop],
      [duplicateToneProp.id, duplicateToneProp],
      [imageProp.id, imageProp],
      [expressionProp.id, expressionProp],
      [countProp.id, countProp],
      [layoutProp.id, layoutProp],
      [legacyProp.id, legacyProp],
    ]),
    dataSources: new Map([
      [
        "site-title",
        {
          type: "variable",
          id: "site-title",
          name: "Site Title",
          value: { type: "string", value: "Webstudio" },
        },
      ],
    ]),
    resources: new Map(),
    styleSources: new Map([
      ["token", { type: "token", id: "token", name: "Card" }],
      ["hero-local", { type: "local", id: "hero-local" }],
    ]),
    styleSourceSelections: new Map([
      ["hero", { instanceId: "hero", values: ["token", "hero-local"] }],
    ]),
    styles: new Map([
      [
        "hero-local:base:color:",
        {
          styleSourceId: "hero-local",
          breakpointId: "base",
          property: "color",
          value: { type: "keyword", value: "red" },
        },
      ],
      [
        "token:base:display:",
        {
          styleSourceId: "token",
          breakpointId: "base",
          property: "display",
          value: { type: "keyword", value: "block" },
        },
      ],
    ]),
    breakpoints: new Map([["base", { id: "base", label: "" }]]),
    assets: new Map([[asset.id, asset]]),
  };
};

const getResolvedTemplate = (
  templates: readonly MaterializedMdxTemplate[]
): Extract<MaterializedMdxTemplate, { type: "resolved-template" }> => {
  for (const template of templates) {
    if (template.type === "resolved-template") {
      return template;
    }
  }
  throw new Error("Expected a resolved template");
};

const getUnresolvedTemplate = (
  templates: readonly MaterializedMdxTemplate[]
): Extract<MaterializedMdxTemplate, { type: "unresolved-template" }> => {
  for (const template of templates) {
    if (template.type === "unresolved-template") {
      return template;
    }
  }
  throw new Error("Expected an unresolved template");
};

describe("materializeMdxTemplates", () => {
  test("copies resolved fragments and represents unresolved usages", async () => {
    const data = createData();
    const originalData = structuredClone(data);
    const materialization = await materializeMdxTemplates({
      identity,
      resolution,
      data,
      metas,
      projectId: "target-project",
    });
    const materializedTemplates = materialization.templates;
    const materialized = getResolvedTemplate(materializedTemplates);

    expect(materializedTemplates).toHaveLength(2);
    expect(materialized.reference.templateName).toBe("Hero Card");
    expect(materialized.fragment.children).toEqual([
      { type: "id", value: expect.stringMatching(/^mdx-/) },
    ]);
    expect(materialized.fragment.instances).toEqual([
      expect.objectContaining({
        component: "Card",
        children: [{ type: "id", value: expect.stringMatching(/^mdx-/) }],
      }),
      expect.objectContaining({
        component: "ws:element",
        tag: "h2",
        children: [{ type: "text", value: "Template title" }],
      }),
    ]);
    expect(materialized.fragment.props).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "tone", value: "strong" }),
        expect.objectContaining({
          name: "image",
          type: "asset",
          value: "image",
        }),
        expect.objectContaining({
          name: "title",
          type: "expression",
          value: encodeDataVariableId("site-title"),
        }),
      ])
    );
    expect(materialized.fragment.styleSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "token", name: "Card" }),
        expect.objectContaining({ type: "local" }),
      ])
    );
    expect(materialized.fragment.styles).toHaveLength(2);
    expect(materialized.fragment.assets).toEqual([
      expect.objectContaining({ id: "image", projectId: "target-project" }),
    ]);
    expect(data).toEqual(originalData);
    expect(materializedTemplates[1]).toEqual(
      expect.objectContaining({
        type: "unresolved-template",
        markerId: expect.stringMatching(/^mdx-/),
        reference: expect.objectContaining({
          type: "unresolved-template",
          templateName: "Missing",
        }),
      })
    );
    expect(materialization.diagnostics).toEqual([
      expect.objectContaining({
        code: "unresolved-template",
        templateName: "Missing",
      }),
    ]);
  });

  test("rejects a resolved reference when its template was removed", async () => {
    const data = createData();
    data.instances.delete("hero");

    await expect(
      materializeMdxTemplates({
        identity,
        resolution,
        data,
        metas,
        projectId: "target-project",
      })
    ).rejects.toThrow('Resolved MDX template instance "hero" is missing');
  });

  test("generates stable IDs scoped by revision, render scope, and usage path", async () => {
    const materialize = (
      nextIdentity: ContentBlockExternalContentIdentity,
      nextResolution: MdxTemplateResolution = resolution
    ) =>
      materializeMdxTemplates({
        identity: nextIdentity,
        resolution: nextResolution,
        data: createData(),
        metas,
        projectId: "target-project",
      });
    const materializeRootId = async (
      nextIdentity: ContentBlockExternalContentIdentity,
      nextResolution: MdxTemplateResolution = resolution
    ) =>
      getResolvedTemplate(
        (await materialize(nextIdentity, nextResolution)).templates
      ).fragment.children[0];
    const materializeMarkerId = async (
      nextIdentity: ContentBlockExternalContentIdentity
    ) =>
      getUnresolvedTemplate((await materialize(nextIdentity)).templates)
        .markerId;

    const first = await materializeRootId(identity);
    expect(await materializeRootId(identity)).toEqual(first);
    expect(
      await materializeRootId({ ...identity, revision: "revision-2" })
    ).not.toEqual(first);
    expect(
      await materializeRootId({ ...identity, renderScope: "route:/other" })
    ).not.toEqual(first);
    const markerId = await materializeMarkerId(identity);
    expect(await materializeMarkerId(identity)).toBe(markerId);
    expect(
      await materializeMarkerId({ ...identity, revision: "revision-2" })
    ).not.toBe(markerId);
    expect(
      await materializeMarkerId({ ...identity, renderScope: "route:/other" })
    ).not.toBe(markerId);
    expect(
      await materializeRootId(identity, {
        references: [
          {
            type: "resolved-template",
            path: [2],
            templateName: "Hero Card",
            props: [],
            templateInstanceId: "hero",
          },
        ],
        diagnostics: [],
        templateNames: ["Hero Card"],
      })
    ).not.toEqual(first);
  });

  test("applies valid props and preserves ignored authored props", async () => {
    const source = `<ws.element ws:name="Card" tone="quiet" featured title="Authored title" count="2" layout="wide" legacy="Authored legacy" missing="preserved" />`;
    const document = await parseMdxDocument({ source });
    const authoredDocument = structuredClone(document);
    const data = createData();
    const originalData = structuredClone(data);
    const materialization = await materializeMdxTemplates({
      identity,
      resolution: resolveMdxTemplates({
        document,
        identity,
        instances: data.instances,
        metas,
      }),
      data,
      metas,
      projectId: "target-project",
    });
    const materialized = getResolvedTemplate(materialization.templates);

    expect(materialized.fragment.props).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "tone", value: "quiet" }),
        expect.objectContaining({ name: "featured", value: true }),
        expect.objectContaining({
          name: "title",
          type: "string",
          value: "Authored title",
        }),
        expect.objectContaining({ name: "count", type: "number", value: 1 }),
        expect.objectContaining({ name: "layout", value: "contained" }),
        expect.objectContaining({ name: "legacy", value: "Template legacy" }),
      ])
    );
    expect(materialized.fragment.dataSources).toEqual([]);
    expect(
      materialized.fragment.props.filter((prop) => prop.name === "tone")
    ).toEqual([expect.objectContaining({ type: "string", value: "quiet" })]);
    expect(
      materialized.fragment.props.find((prop) => prop.name === "missing")
    ).toBeUndefined();
    expect(document).toEqual(authoredDocument);
    expect(data).toEqual(originalData);
    expect(
      (await parseMdxDocument({ source: serializeMdxDocument(document) }))
        .children[0]
    ).toMatchObject({
      type: "template",
      props: [
        { name: "tone", value: "quiet" },
        { name: "featured", value: true },
        { name: "title", value: "Authored title" },
        { name: "count", value: "2" },
        { name: "layout", value: "wide" },
        { name: "legacy", value: "Authored legacy" },
        { name: "missing", value: "preserved" },
      ],
    });
    expect(materialization.diagnostics).toEqual([
      expect.objectContaining({
        code: "ignored-template-prop",
        propName: "count",
        reason: "incompatible",
      }),
      expect.objectContaining({
        code: "ignored-template-prop",
        propName: "layout",
        reason: "design-only",
      }),
      expect.objectContaining({
        code: "ignored-template-prop",
        propName: "legacy",
        reason: "stale",
      }),
      expect.objectContaining({
        code: "ignored-template-prop",
        propName: "missing",
        reason: "unknown",
      }),
    ]);
  });

  test("tracks effective names and deduplicated template revisions", async () => {
    const data = createData();
    const originalData = structuredClone(data);
    const materialize = (sourceData = data) =>
      materializeMdxTemplates({
        identity,
        resolution: {
          ...resolution,
          references: [
            resolution.references[0],
            {
              type: "resolved-template",
              path: [2],
              templateName: "Hero Card",
              templateInstanceId: "hero",
              props: [],
            },
          ],
          diagnostics: [],
        },
        data: sourceData,
        metas,
        projectId: "target-project",
      });

    const firstMaterialization = await materialize();
    expect(data).toEqual(originalData);
    const first = firstMaterialization.dependencies;
    expect(first.templateNames).toEqual(["Hero Card"]);
    expect(first.templates).toEqual([
      {
        templateInstanceId: "hero",
        templateName: "Hero Card",
        revision: expect.stringMatching(/^sha256:[0-9a-f]{64}$/),
      },
    ]);
    const rootIds = firstMaterialization.templates.flatMap((template) =>
      template.type === "resolved-template"
        ? template.fragment.children.map((child) => child.value)
        : []
    );
    expect(new Set(rootIds).size).toBe(2);

    const reorderedData = createData();
    const reorderedAsset = reorderedData.assets.get("image");
    if (reorderedAsset?.type !== "image") {
      throw new Error("Expected image Asset");
    }
    reorderedData.assets.set("image", {
      ...reorderedAsset,
      meta: { height: 10, width: 10 },
    });
    expect(
      (await materialize(reorderedData)).dependencies.templates[0].revision
    ).toBe(first.templates[0].revision);

    data.instances.get("heading")?.children.push({
      type: "text",
      value: "Changed",
    });
    expect((await materialize()).dependencies.templates[0].revision).not.toBe(
      first.templates[0].revision
    );
  });
});
