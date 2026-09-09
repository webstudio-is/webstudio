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
  materializeMdxAuthoredContent,
  serializeMdxAuthoredContent,
} from "./mdx-authored-content";
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

  test("generates stable IDs scoped by Asset, render scope, and usage path", async () => {
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
    ).toEqual(first);
    expect(
      await materializeRootId({ ...identity, assetId: "other-asset" })
    ).not.toEqual(first);
    expect(
      await materializeRootId({ ...identity, renderScope: "route:/other" })
    ).not.toEqual(first);
    const markerId = await materializeMarkerId(identity);
    expect(await materializeMarkerId(identity)).toBe(markerId);
    expect(
      await materializeMarkerId({ ...identity, revision: "revision-2" })
    ).toBe(markerId);
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
    const source = `<ws.element ws:name="Card" tone="quiet" featured title="Authored title" count="2" layout="wide" legacy="Authored legacy" missing="preserved" customCount="2" customFlag="false" />`;
    const document = await parseMdxDocument({ source });
    const authoredDocument = structuredClone(document);
    const data = createData();
    data.props.set("hero:custom-count", {
      id: "hero:custom-count",
      instanceId: "hero",
      name: "customCount",
      type: "number",
      value: 1,
    });
    data.props.set("hero:custom-flag", {
      id: "hero:custom-flag",
      instanceId: "hero",
      name: "customFlag",
      type: "boolean",
      value: true,
    });
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

    expect(materialized.editablePropNames).toEqual([
      "tone",
      "featured",
      "title",
      "count",
      "legacy",
      "customCount",
      "customFlag",
      "missing",
    ]);
    expect(materialized.fragment.props).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "tone", value: "quiet" }),
        expect.objectContaining({ name: "featured", value: true }),
        expect.objectContaining({
          name: "title",
          type: "string",
          value: "Authored title",
        }),
        expect.objectContaining({ name: "count", type: "number", value: 2 }),
        expect.objectContaining({ name: "layout", value: "contained" }),
        expect.objectContaining({
          name: "legacy",
          value: "Authored legacy",
        }),
        expect.objectContaining({
          name: "customCount",
          type: "number",
          value: 2,
        }),
        expect.objectContaining({
          name: "customFlag",
          type: "boolean",
          value: false,
        }),
      ])
    );
    expect(materialized.fragment.dataSources).toEqual([]);
    expect(
      materialized.fragment.props.filter((prop) => prop.name === "tone")
    ).toEqual([expect.objectContaining({ type: "string", value: "quiet" })]);
    expect(
      materialized.fragment.props.find((prop) => prop.name === "missing")
    ).toEqual(expect.objectContaining({ type: "string", value: "preserved" }));
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
        { name: "customCount", value: "2" },
        { name: "customFlag", value: "false" },
      ],
    });
    expect(materialization.diagnostics).toEqual([
      expect.objectContaining({
        code: "ignored-template-prop",
        propName: "layout",
        reason: "design-only",
      }),
    ]);
  });

  test("moves the legacy Code Text property into text content", async () => {
    const data = createData();
    const codeText = data.instances.get("hero");
    if (codeText === undefined) {
      throw new Error("Expected template instance");
    }
    codeText.component = "CodeText";
    codeText.children = [{ type: "text", value: "template code" }];
    data.props.clear();
    const materialization = await materializeMdxTemplates({
      identity,
      resolution: {
        templateNames: ["Code Text"],
        diagnostics: [],
        references: [
          {
            type: "resolved-template",
            path: [0],
            templateName: "Code Text",
            templateInstanceId: "hero",
            props: [{ name: "code", value: "const answer = 42;" }],
          },
        ],
      },
      data,
      metas: new Map([
        [
          "CodeText",
          {
            contentModel: { category: "instance", children: ["text"] },
          },
        ],
      ]),
      projectId: "target-project",
    });
    const materialized = getResolvedTemplate(materialization.templates);
    const rootId = materialized.fragment.children[0]?.value;
    const root = materialized.fragment.instances.find(
      (instance) => instance.id === rootId
    );

    expect(root?.children).toEqual([
      { type: "text", value: "const answer = 42;" },
    ]);
    expect(materialized.fragment.props).toEqual([]);
    expect(materialization.diagnostics).toEqual([]);
  });

  test("materializes JSX aliases as standard Webstudio HTML props", async () => {
    const data = createData();
    const codeText = data.instances.get("hero");
    if (codeText === undefined) {
      throw new Error("Expected template instance");
    }
    codeText.component = "CodeText";
    codeText.children = [{ type: "text", value: "const ready = true;" }];
    data.props.clear();
    const document = await parseMdxDocument({
      source:
        '<ws.element ws:name="CodeText" className="example" tabIndex="2" hidden="false">const ready = true;</ws.element>',
    });
    const codeTextMetas = new Map<string, WsComponentMeta>([
      ["CodeText", { presetStyle: { code: [] } }],
    ]);
    const materialization = await materializeMdxTemplates({
      identity,
      resolution: resolveMdxTemplates({
        document,
        identity,
        instances: data.instances,
        metas: codeTextMetas,
      }),
      data,
      metas: codeTextMetas,
      projectId: "target-project",
    });
    const materialized = getResolvedTemplate(materialization.templates);

    expect(materialized.fragment.props).toEqual([
      expect.objectContaining({
        name: "class",
        type: "string",
        value: "example",
      }),
      expect.objectContaining({
        name: "tabindex",
        type: "number",
        value: 2,
      }),
      expect.objectContaining({
        name: "hidden",
        type: "boolean",
        value: false,
      }),
    ]);
    expect(materialized.editablePropNames).toContain("class");
    expect(materialization.diagnostics).toEqual([]);
  });

  test("normalizes class even when component metadata uses className", async () => {
    const data = createData();
    const card = data.instances.get("hero");
    if (card === undefined) {
      throw new Error("Expected template instance");
    }
    card.tag = "div";
    data.props.set("hero:className", {
      id: "hero:className",
      instanceId: card.id,
      name: "className",
      type: "string",
      value: "template",
    });
    const cardMetas = new Map<string, WsComponentMeta>([
      [
        "Card",
        {
          presetStyle: { div: [] },
          props: {
            className: {
              type: "string",
              control: "text",
              required: false,
              contentMode: true,
            },
          },
        },
      ],
    ]);
    const document = await parseMdxDocument({
      source: '<ws.element ws:name="Card" className="authored" />',
    });
    const materialization = await materializeMdxTemplates({
      identity,
      resolution: resolveMdxTemplates({
        document,
        identity,
        instances: data.instances,
        metas: cardMetas,
      }),
      data,
      metas: cardMetas,
      projectId: "target-project",
    });
    const materialized = getResolvedTemplate(materialization.templates);

    expect(materialized.fragment.props).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "class",
          type: "string",
          value: "authored",
        }),
      ])
    );
    expect(
      materialized.fragment.props.some(({ name }) => name === "className")
    ).toBe(false);
    expect(materialized.propNameMappings).toContainEqual({
      jsxPropName: "className",
      instancePropName: "class",
    });
  });

  test("normalizes a stored JSX-form alias when it is authored", async () => {
    const data = createData();
    const card = data.instances.get("hero");
    if (card === undefined) {
      throw new Error("Expected template instance");
    }
    card.tag = "div";
    data.props.set("hero:tabIndex", {
      id: "hero:tabIndex",
      instanceId: card.id,
      name: "tabIndex",
      type: "number",
      value: 1,
    });
    const materialization = await materializeMdxTemplates({
      identity,
      resolution: {
        ...resolution,
        references: [
          {
            type: "resolved-template",
            path: [0],
            templateName: "Hero Card",
            templateInstanceId: "hero",
            props: [{ name: "tabIndex", value: "2" }],
          },
        ],
      },
      data,
      metas,
      projectId: "target-project",
    });
    const materialized = getResolvedTemplate(materialization.templates);

    expect(materialized.fragment.props).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "tabindex",
          type: "number",
          value: 2,
        }),
      ])
    );
    expect(
      materialized.fragment.props.some(({ name }) => name === "tabIndex")
    ).toBe(false);
  });

  test("normalizes a stored JSX-form alias without an authored override", async () => {
    const data = createData();
    const card = data.instances.get("hero");
    if (card === undefined) {
      throw new Error("Expected template instance");
    }
    card.tag = "div";
    data.props.set("hero:tabIndex", {
      id: "hero:tabIndex",
      instanceId: card.id,
      name: "tabIndex",
      type: "number",
      value: 1,
    });
    const materialization = await materializeMdxTemplates({
      identity,
      resolution,
      data,
      metas,
      projectId: "target-project",
    });
    const materialized = getResolvedTemplate(materialization.templates);

    expect(materialized.fragment.props).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "tabindex", type: "number", value: 1 }),
      ])
    );
    expect(
      materialized.fragment.props.some(({ name }) => name === "tabIndex")
    ).toBe(false);
  });

  test("maps stored standard props to canonical JSX names", async () => {
    const data = createData();
    const card = data.instances.get("hero");
    if (card === undefined) {
      throw new Error("Expected template instance");
    }
    card.tag = "div";
    data.props.set("hero:class", {
      id: "hero:class",
      instanceId: card.id,
      name: "class",
      type: "string",
      value: "featured",
    });
    const materialization = await materializeMdxTemplates({
      identity,
      resolution,
      data,
      metas,
      projectId: "target-project",
    });
    const materialized = getResolvedTemplate(materialization.templates);

    expect(materialized.propNameMappings).toContainEqual({
      jsxPropName: "className",
      instancePropName: "class",
    });
  });

  test("does not let standard attributes bypass design-only component props", async () => {
    const data = createData();
    const link = data.instances.get("hero");
    if (link === undefined) {
      throw new Error("Expected template instance");
    }
    link.component = "Link";
    data.props.clear();
    const document = await parseMdxDocument({
      source: '<ws.element ws:name="Link" target="_blank" />',
    });
    const linkMetas = new Map<string, WsComponentMeta>([
      [
        "Link",
        {
          presetStyle: { a: [] },
          props: {
            target: {
              type: "string",
              control: "text",
              required: false,
            },
          },
        },
      ],
    ]);
    const materialization = await materializeMdxTemplates({
      identity,
      resolution: resolveMdxTemplates({
        document,
        identity,
        instances: data.instances,
        metas: linkMetas,
      }),
      data,
      metas: linkMetas,
      projectId: "target-project",
    });
    const materialized = getResolvedTemplate(materialization.templates);

    expect(
      materialized.fragment.props.find(({ name }) => name === "target")
    ).toBeUndefined();
    expect(materialization.diagnostics).toEqual([
      expect.objectContaining({
        code: "ignored-template-prop",
        propName: "target",
        reason: "design-only",
      }),
    ]);
  });

  test("does not let JSX aliases bypass design-only component props", async () => {
    const data = createData();
    const card = data.instances.get("hero");
    if (card === undefined) {
      throw new Error("Expected template instance");
    }
    card.tag = "div";
    data.props.clear();
    const document = await parseMdxDocument({
      source: '<ws.element ws:name="Card" className="authored" />',
    });
    const cardMetas = new Map<string, WsComponentMeta>([
      [
        "Card",
        {
          presetStyle: { div: [] },
          props: {
            className: {
              type: "string",
              control: "text",
              required: false,
            },
          },
        },
      ],
    ]);
    const materialization = await materializeMdxTemplates({
      identity,
      resolution: resolveMdxTemplates({
        document,
        identity,
        instances: data.instances,
        metas: cardMetas,
      }),
      data,
      metas: cardMetas,
      projectId: "target-project",
    });
    const materialized = getResolvedTemplate(materialization.templates);

    expect(
      materialized.fragment.props.some(({ name }) => name === "class")
    ).toBe(false);
    expect(materialization.diagnostics).toEqual([
      expect.objectContaining({
        code: "ignored-template-prop",
        propName: "className",
        reason: "design-only",
      }),
    ]);
  });

  test("renders the canonical prop and preserves a conflicting authored alias", async () => {
    const data = createData();
    const card = data.instances.get("hero");
    if (card === undefined) {
      throw new Error("Expected template instance");
    }
    card.tag = "div";
    data.props.clear();
    const document = await parseMdxDocument({
      source:
        '<ws.element ws:name="Card" class="legacy" className="canonical" />',
    });
    const cardMetas = new Map<string, WsComponentMeta>([
      [
        "Card",
        {
          presetStyle: { div: [] },
          props: {
            className: {
              type: "string",
              control: "text",
              required: false,
              contentMode: true,
            },
          },
        },
      ],
    ]);
    const templateMaterialization = await materializeMdxTemplates({
      identity,
      resolution: resolveMdxTemplates({
        document,
        identity,
        instances: data.instances,
        metas: cardMetas,
      }),
      data,
      metas: cardMetas,
      projectId: "target-project",
    });
    const materialized = getResolvedTemplate(templateMaterialization.templates);

    expect(materialized.fragment.props).toEqual([
      expect.objectContaining({ name: "class", value: "canonical" }),
    ]);
    expect(materialized.ignoredJsxPropNames).toEqual(["class"]);
    expect(templateMaterialization.diagnostics).toEqual([
      expect.objectContaining({
        code: "ignored-template-prop",
        propName: "class",
        reason: "incompatible",
        sourceRange: {
          start: expect.objectContaining({ line: 1, column: 28 }),
          end: expect.objectContaining({ line: 1, column: 42 }),
        },
      }),
    ]);

    const root = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization,
    });
    const next = structuredClone(root.fragment);
    const classProp = next.props.find(({ name }) => name === "class");
    if (classProp?.type !== "string") {
      throw new Error("Expected class prop");
    }
    classProp.value = "changed";

    expect(await serializeMdxAuthoredContent({ root, fragment: next })).toBe(
      '<Card class="legacy" className="changed" />\n'
    );
  });

  test("uses a valid alias when the canonical authored prop is invalid", async () => {
    const data = createData();
    const card = data.instances.get("hero");
    if (card === undefined) {
      throw new Error("Expected template instance");
    }
    card.tag = "div";
    data.props.clear();
    const document = await parseMdxDocument({
      source: '<ws.element ws:name="Card" class="valid" className />',
    });
    const cardMetas = new Map<string, WsComponentMeta>([
      [
        "Card",
        {
          presetStyle: { div: [] },
          props: {
            className: {
              type: "string",
              control: "text",
              required: false,
              contentMode: true,
            },
          },
        },
      ],
    ]);
    const templateMaterialization = await materializeMdxTemplates({
      identity,
      resolution: resolveMdxTemplates({
        document,
        identity,
        instances: data.instances,
        metas: cardMetas,
      }),
      data,
      metas: cardMetas,
      projectId: "target-project",
    });
    const materialized = getResolvedTemplate(templateMaterialization.templates);

    expect(materialized.fragment.props).toEqual([
      expect.objectContaining({ name: "class", value: "valid" }),
    ]);
    expect(materialized.ignoredJsxPropNames).toEqual(["className"]);

    const root = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization,
    });
    const next = structuredClone(root.fragment);
    const classProp = next.props.find(({ name }) => name === "class");
    if (classProp?.type !== "string") {
      throw new Error("Expected class prop");
    }
    classProp.value = "changed";

    expect(await serializeMdxAuthoredContent({ root, fragment: next })).toBe(
      '<Card class="changed" className />\n'
    );
  });

  test("prefers a stored canonical prop over a conflicting JSX alias", async () => {
    const data = createData();
    const card = data.instances.get("hero");
    if (card === undefined) {
      throw new Error("Expected template instance");
    }
    card.tag = "div";
    data.props.clear();
    data.props.set("hero:className", {
      id: "hero:className",
      instanceId: card.id,
      name: "className",
      type: "string",
      value: "legacy",
    });
    data.props.set("hero:class", {
      id: "hero:class",
      instanceId: card.id,
      name: "class",
      type: "string",
      value: "canonical",
    });
    const materialization = await materializeMdxTemplates({
      identity,
      resolution,
      data,
      metas,
      projectId: "target-project",
    });
    const materialized = getResolvedTemplate(materialization.templates);

    expect(
      materialized.fragment.props.filter(({ name }) => name === "class")
    ).toEqual([expect.objectContaining({ value: "canonical" })]);
    expect(
      materialized.fragment.props.some(({ name }) => name === "className")
    ).toBe(false);
    expect(materialization.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "ignored-template-prop",
          propName: "className",
          reason: "incompatible",
        }),
      ])
    );
  });

  test("isolates ignored props to the invalid template occurrence", async () => {
    const data = createData();
    const document = await parseMdxDocument({
      source:
        '<ws.element ws:name="Card" count="invalid" />\n\n<ws.element ws:name="Card" count="2" />',
    });
    const templateMaterialization = await materializeMdxTemplates({
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
    const root = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization,
    });
    const templates = root.provenance.nodes.filter(
      (node) => node.type === "template"
    );

    expect(templates).toHaveLength(2);
    expect(templates[0]?.editablePropNames).not.toContain("count");
    expect(templates[1]?.editablePropNames).toContain("count");
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
