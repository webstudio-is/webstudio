import { describe, expect, test } from "vitest";
import {
  encodeDataVariableId,
  type Asset,
  type ContentBlockExternalContentIdentity,
  type Instance,
  type Prop,
  type WebstudioData,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
import { materializeMdxTemplates } from "./mdx-materialization";
import type { MdxTemplateResolution } from "./mdx-template-resolution";

const identity: ContentBlockExternalContentIdentity = {
  blockInstanceId: "block",
  assetId: "article",
  revision: "revision-1",
  contentRef: "articles/hello.mdx",
  format: "mdx",
  renderScope: "route:/hello",
};

const resolution: MdxTemplateResolution = {
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
  diagnostics: [],
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
      [hero.id, hero],
      [heading.id, heading],
    ]),
    props: new Map<Prop["id"], Prop>([
      [prop.id, prop],
      [imageProp.id, imageProp],
      [expressionProp.id, expressionProp],
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

describe("materializeMdxTemplates", () => {
  test("copies complete resolved template fragments and skips unresolved usages", () => {
    const data = createData();
    const originalData = structuredClone(data);
    const materializedTemplates = materializeMdxTemplates({
      identity,
      resolution,
      data,
      metas,
      projectId: "target-project",
    });
    const [materialized] = materializedTemplates;

    expect(materializedTemplates).toHaveLength(1);
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
  });

  test("rejects a resolved reference when its template was removed", () => {
    const data = createData();
    data.instances.delete("hero");

    expect(() =>
      materializeMdxTemplates({
        identity,
        resolution,
        data,
        metas,
        projectId: "target-project",
      })
    ).toThrow('Resolved MDX template instance "hero" is missing');
  });

  test("generates stable IDs scoped by revision, render scope, and usage path", () => {
    const materializeRootId = (
      nextIdentity: ContentBlockExternalContentIdentity,
      nextResolution: MdxTemplateResolution = resolution
    ) =>
      materializeMdxTemplates({
        identity: nextIdentity,
        resolution: nextResolution,
        data: createData(),
        metas,
        projectId: "target-project",
      })[0].fragment.children[0];

    const first = materializeRootId(identity);
    expect(materializeRootId(identity)).toEqual(first);
    expect(
      materializeRootId({ ...identity, revision: "revision-2" })
    ).not.toEqual(first);
    expect(
      materializeRootId({ ...identity, renderScope: "route:/other" })
    ).not.toEqual(first);
    expect(
      materializeRootId(identity, {
        ...resolution,
        references: [
          {
            type: "resolved-template",
            path: [2],
            templateName: "Hero Card",
            props: [],
            templateInstanceId: "hero",
          },
        ],
      })
    ).not.toEqual(first);
  });

  test("applies Content-mode props and diagnoses ignored props", () => {
    const [materialized] = materializeMdxTemplates({
      identity,
      resolution: {
        references: [
          {
            type: "resolved-template",
            path: [0],
            templateName: "Hero Card",
            templateInstanceId: "hero",
            props: [
              { name: "tone", value: "quiet" },
              { name: "featured", value: true },
              { name: "title", value: "Authored title" },
              { name: "count", value: "2" },
              { name: "layout", value: "wide" },
              { name: "missing", value: "preserved" },
            ],
          },
        ],
        diagnostics: [],
      },
      data: createData(),
      metas,
      projectId: "target-project",
    });

    expect(materialized.fragment.props).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "tone", value: "quiet" }),
        expect.objectContaining({ name: "featured", value: true }),
        expect.objectContaining({
          name: "title",
          type: "string",
          value: "Authored title",
        }),
      ])
    );
    expect(materialized.fragment.dataSources).toEqual([]);
    expect(
      materialized.fragment.props.filter((prop) =>
        ["count", "layout", "missing"].includes(prop.name)
      )
    ).toEqual([]);
    expect(materialized.diagnostics).toEqual([
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
        propName: "missing",
        reason: "unknown",
      }),
    ]);
  });
});
