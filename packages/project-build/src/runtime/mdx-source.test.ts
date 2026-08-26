import { describe, expect, test } from "vitest";
import {
  type Asset,
  blockComponent,
  blockTemplateComponent,
  type ContentBlockExternalContentIdentity,
  type WebstudioData,
} from "@webstudio-is/sdk";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
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
      source: "![Hero](./hero.png)",
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
  });
});
