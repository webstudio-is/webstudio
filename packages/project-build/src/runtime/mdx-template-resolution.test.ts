import { describe, expect, test } from "vitest";
import { parseMdxDocument } from "@webstudio-is/content-engine/mdx";
import {
  blockComponent,
  blockTemplateComponent,
  elementComponent,
  type ContentBlockExternalContentIdentity,
  type Instance,
  type Instances,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
import { resolveMdxTemplates } from "./mdx-template-resolution";

const createInstance = (
  id: string,
  component: string,
  values: Partial<Pick<Instance, "children" | "label" | "tag">> = {}
): Instance => ({ type: "instance", id, component, children: [], ...values });

const identity: ContentBlockExternalContentIdentity = {
  blockInstanceId: "block",
  assetId: "article",
  revision: "revision-1",
  contentRef: "articles/hello.mdx",
  format: "mdx",
  renderScope: "route:/hello",
};

const metas = new Map<string, WsComponentMeta>([
  ["Card", { label: "Card" }],
  ["Badge", { label: "Badge" }],
]);

const createInstances = (): Instances =>
  new Map([
    [
      "block",
      createInstance("block", blockComponent, {
        children: [{ type: "id", value: "templates" }],
      }),
    ],
    [
      "templates",
      createInstance("templates", blockTemplateComponent, {
        children: [
          { type: "id", value: "hero" },
          { type: "id", value: "card" },
        ],
      }),
    ],
    [
      "hero",
      createInstance("hero", elementComponent, {
        label: "Hero Card",
        tag: "section",
      }),
    ],
    [
      "card",
      createInstance("card", "Card", {
        children: [{ type: "id", value: "badge" }],
      }),
    ],
    ["badge", createInstance("badge", "Badge", { label: "Nested" })],
  ]);

describe("resolveMdxTemplates", () => {
  test("resolves exact displayed names from the direct flat Templates list", async () => {
    const document = await parseMdxDocument({
      source: `<ws.element ws:name="Hero Card" />

<ws.element ws:tag="section">
  <ws.element ws:name="Card" />
</ws.element>`,
    });

    const result = resolveMdxTemplates({
      document,
      identity,
      instances: createInstances(),
      metas,
    });

    expect(result.references).toEqual([
      expect.objectContaining({
        type: "resolved-template",
        path: [0],
        templateName: "Hero Card",
        templateInstanceId: "hero",
      }),
      expect.objectContaining({
        type: "resolved-template",
        path: [1, 0],
        templateName: "Card",
        templateInstanceId: "card",
      }),
    ]);
    expect(result.diagnostics).toEqual([]);
  });

  test("does not resolve descendants of a template entry or inexact names", async () => {
    const document = await parseMdxDocument({
      source: `<ws.element ws:name="Nested" />

<ws.element ws:name=" Hero Card " />`,
    });

    const result = resolveMdxTemplates({
      document,
      identity,
      instances: createInstances(),
      metas,
    });

    expect(result.references).toEqual([
      expect.objectContaining({
        type: "unresolved-template",
        path: [0],
        templateName: "Nested",
      }),
      expect.objectContaining({
        type: "unresolved-template",
        path: [1],
        templateName: " Hero Card ",
      }),
    ]);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: "unresolved-template",
        blockInstanceId: "block",
        assetId: "article",
        contentRef: "articles/hello.mdx",
        renderScope: "route:/hello",
        templateName: "Nested",
      }),
      expect.objectContaining({
        code: "unresolved-template",
        templateName: " Hero Card ",
      }),
    ]);
  });

  test("keeps ambiguous duplicate displayed names unresolved", async () => {
    const instances = createInstances();
    instances.set(
      "duplicate",
      createInstance("duplicate", "Card", { label: "Hero Card" })
    );
    instances.get("templates")?.children.push({
      type: "id",
      value: "duplicate",
    });
    const document = await parseMdxDocument({
      source: `<ws.element ws:name="Hero Card">Preserved</ws.element>`,
    });

    const result = resolveMdxTemplates({
      document,
      identity,
      instances,
      metas,
    });

    expect(result.references).toEqual([
      expect.objectContaining({
        type: "unresolved-template",
        path: [0],
        templateName: "Hero Card",
      }),
    ]);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: "unresolved-template",
        templateName: "Hero Card",
      }),
    ]);
    expect(document.children[0]).toMatchObject({
      type: "template",
      name: "Hero Card",
      children: [{ type: "text", value: "Preserved" }],
    });
  });

  test("does not resolve or diagnose descendants of an unresolved subtree", async () => {
    const document = await parseMdxDocument({
      source: `<ws.element ws:name="Missing">
  <ws.element ws:name="Card" />
  <ws.element ws:name="Also Missing" />
</ws.element>`,
    });

    const result = resolveMdxTemplates({
      document,
      identity,
      instances: createInstances(),
      metas,
    });

    expect(result.references).toEqual([
      expect.objectContaining({
        type: "unresolved-template",
        path: [0],
        templateName: "Missing",
      }),
    ]);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: "unresolved-template",
        templateName: "Missing",
      }),
    ]);
  });
});
