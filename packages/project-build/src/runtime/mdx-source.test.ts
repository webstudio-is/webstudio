import { describe, expect, test } from "vitest";
import {
  type Asset,
  blockComponent,
  blockTemplateComponent,
  type ContentBlockExternalContentIdentity,
  type WebstudioData,
} from "@webstudio-is/sdk";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import { serializeMdxAuthoredContent } from "./mdx-authored-content";
import { materializeMdxSource } from "./mdx-source";

const identity: ContentBlockExternalContentIdentity = {
  blockInstanceId: "block",
  assetId: "article",
  revision: "sha256:revision",
  contentRef: "article.mdx",
  format: "mdx",
  renderScope: "page",
};

const data: Omit<WebstudioData, "pages"> = {
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
        children: [],
      },
    ],
  ]),
  props: new Map(),
  dataSources: new Map(),
  resources: new Map(),
  styleSources: new Map(),
  styleSourceSelections: new Map(),
  styles: new Map(),
  breakpoints: new Map(),
  assets: new Map(),
};

describe("materializeMdxSource", () => {
  test("uses the shared recovery result and materializes valid siblings", async () => {
    const result = await materializeMdxSource({
      source: "# Hello\n\n{dangerous()}\n\nAfter",
      identity,
      data,
      metas: componentMetas,
      projectId: "project",
    });

    expect(result.root.fragment.instances.map(({ tag }) => tag)).toEqual([
      "h1",
      "p",
    ]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      code: "unsafe-mdx",
      contentRef: "article.mdx",
      renderScope: "page",
    });
  });

  test("reports authored elements that violate the HTML content model", async () => {
    const result = await materializeMdxSource({
      source: `1. test

   <ws.element ws:tag="li">nested item</ws.element>
`,
      identity,
      data,
      metas: componentMetas,
      projectId: "project",
    });

    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: "invalid-mdx",
        severity: "error",
        message: "Placing <li> element inside a <li> violates HTML spec.",
        sourceRange: expect.objectContaining({
          start: expect.objectContaining({ line: 3 }),
        }),
      }),
    ]);
  });

  test("resolves relative authored Asset references with canonical Asset names", async () => {
    const sourceData: Omit<WebstudioData, "pages"> = {
      ...data,
      assetFolders: new Map(),
      assets: new Map<string, Asset>([
        [
          "article",
          {
            id: "article",
            projectId: "project",
            type: "file",
            format: "mdx",
            name: "article_hash.mdx",
            filename: "article",
            size: 0,
            createdAt: "2026-01-01T00:00:00.000Z",
            description: null,
            meta: {},
          },
        ],
        [
          "hero",
          {
            id: "hero",
            projectId: "project",
            type: "image",
            format: "png",
            name: "hero_hash.png",
            filename: "hero",
            size: 0,
            createdAt: "2026-01-01T00:00:00.000Z",
            description: null,
            meta: { width: 100, height: 100 },
          },
        ],
      ]),
    };

    const result = await materializeMdxSource({
      source: `---
featureImage:
  $ref: ./hero.png
---

![Hero](./hero.png)`,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });

    expect(result.root.fragment.props).toContainEqual(
      expect.objectContaining({ name: "src", type: "asset", value: "hero" })
    );
    expect(result.root.fragment.assets).toEqual([
      expect.objectContaining({ id: "hero" }),
    ]);
    expect(result.root.resolvedFrontmatter).toMatchObject({
      featureImage: {
        id: "hero",
        src: expect.stringContaining("hero_hash.png"),
        width: 100,
        height: 100,
      },
    });
  });

  test("serializes an Asset selected on an inserted Image template", async () => {
    const sourceData: Omit<WebstudioData, "pages"> = {
      ...data,
      instances: new Map(data.instances),
      assetFolders: new Map(),
      assets: new Map<string, Asset>([
        [
          "article",
          {
            id: "article",
            projectId: "project",
            type: "file",
            format: "mdx",
            name: "article_hash.mdx",
            filename: "article",
            size: 0,
            createdAt: "2026-01-01T00:00:00.000Z",
            description: null,
            meta: {},
          },
        ],
        [
          "hero",
          {
            id: "hero",
            projectId: "project",
            type: "image",
            format: "png",
            name: "hero_hash.png",
            filename: "hero",
            size: 0,
            createdAt: "2026-01-01T00:00:00.000Z",
            description: null,
            meta: { width: 100, height: 100 },
          },
        ],
      ]),
    };
    sourceData.instances.set("image-template", {
      type: "instance",
      id: "image-template",
      component: "Image",
      children: [],
    });
    sourceData.instances.get("templates")?.children.push({
      type: "id",
      value: "image-template",
    });
    const result = await materializeMdxSource({
      source: '<ws.element ws:name="Image" />',
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    const fragment = structuredClone(result.root.fragment);
    const image = fragment.instances.find(
      ({ component }) => component === "Image"
    );
    if (image === undefined) {
      throw new Error("Expected materialized Image");
    }
    for (const name of ["src", "width", "height", "alt"]) {
      fragment.props.push({
        id: `image-${name}`,
        instanceId: image.id,
        name,
        type: "asset",
        value: "hero",
      });
    }
    const hero = sourceData.assets.get("hero");
    if (hero === undefined) {
      throw new Error("Expected hero Asset");
    }
    fragment.assets.push(hero);

    const source = await serializeMdxAuthoredContent({
      root: result.root,
      fragment,
    });
    expect(source).toBe("![](./hero.png)\n");

    const customized = structuredClone(fragment);
    customized.props.push({
      id: "image-class",
      instanceId: image.id,
      name: "class",
      type: "string",
      value: "hero",
    });
    expect(
      await serializeMdxAuthoredContent({
        root: result.root,
        fragment: customized,
      })
    ).toBe(
      '<ws.element ws:name="Image" src="./hero.png" className="hero" />\n'
    );

    const reloaded = await materializeMdxSource({
      source,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    expect(
      reloaded.root.fragment.props.map(({ name, type, value }) => ({
        name,
        type,
        value,
      }))
    ).toEqual(
      ["src", "width", "height", "alt"].map((name) => ({
        name,
        type: "asset",
        value: "hero",
      }))
    );
    expect(reloaded.root.fragment.instances).toEqual([
      expect.objectContaining({ component: "Image" }),
    ]);

    const reset = structuredClone(reloaded.root.fragment);
    reset.props = reset.props.filter(({ name }) => name !== "src");
    const resetSource = await serializeMdxAuthoredContent({
      root: reloaded.root,
      fragment: reset,
    });
    expect(resetSource).toBe("![]()\n");
    const resetReloaded = await materializeMdxSource({
      source: resetSource,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    expect(resetReloaded.root.fragment.props).toEqual([]);
  });
});
