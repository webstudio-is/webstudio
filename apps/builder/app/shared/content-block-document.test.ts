import { describe, expect, test } from "vitest";
import {
  getSelectedContentBlockDocumentBindingPath,
  getSelectedContentBlockExpressionMode,
  isObjectPathWritable,
  setObjectPathValue,
} from "./content-block-document";
import {
  blockComponent,
  blockTemplateComponent,
  contentBlockDocumentProp,
  encodeDataSourceVariable,
  type Instance,
  type Prop,
} from "@webstudio-is/sdk";

describe("Content Block document bindings", () => {
  test("uses the selected external root instead of an enclosing Content Block", () => {
    const instances = new Map<string, Instance>([
      [
        "inner",
        {
          type: "instance",
          id: "inner",
          component: blockComponent,
          children: [],
        },
      ],
      [
        "outer",
        {
          type: "instance",
          id: "outer",
          component: blockComponent,
          children: [],
        },
      ],
    ]);
    const props = new Map<string, Prop>([
      [
        "outer-source",
        {
          id: "outer-source",
          instanceId: "outer",
          name: "src",
          type: "asset",
          value: "outer-article",
        },
      ],
      [
        "inner-source",
        {
          id: "inner-source",
          instanceId: "inner",
          name: "src",
          type: "asset",
          value: "inner-article",
        },
      ],
      [
        "outer-document",
        {
          id: "outer-document",
          instanceId: "outer",
          name: contentBlockDocumentProp,
          type: "parameter",
          value: "outerDocument",
        },
      ],
      [
        "inner-document",
        {
          id: "inner-document",
          instanceId: "inner",
          name: contentBlockDocumentProp,
          type: "parameter",
          value: "innerDocument",
        },
      ],
    ]);

    expect(
      getSelectedContentBlockDocumentBindingPath({
        binding: {
          type: "expression",
          value: `${encodeDataSourceVariable("innerDocument")}.frontmatter.title`,
          mode: "readwrite",
        },
        instanceSelector: ["heading", "outer"],
        instances,
        props,
        sourceBlockInstanceId: "inner",
        renderedBlockInstanceId: "outer",
      })
    ).toEqual(["title"]);
  });

  test("does not infer write access from a direct expression alone", () => {
    expect(
      getSelectedContentBlockDocumentBindingPath({
        binding: {
          type: "expression",
          value: `${encodeDataSourceVariable("innerDocument")}.frontmatter.title`,
        },
        instanceSelector: ["heading", "inner"],
        instances: new Map([
          [
            "inner",
            {
              type: "instance",
              id: "inner",
              component: blockComponent,
              children: [],
            },
          ],
        ]),
        props: new Map<string, Prop>([
          [
            "inner-source",
            {
              id: "inner-source",
              instanceId: "inner",
              name: "src",
              type: "asset",
              value: "article",
            },
          ],
          [
            "inner-document",
            {
              id: "inner-document",
              instanceId: "inner",
              name: contentBlockDocumentProp,
              type: "parameter",
              value: "innerDocument",
            },
          ],
        ]),
      })
    ).toBeUndefined();
  });

  test("does not expose a writable document target after disconnect", () => {
    expect(
      getSelectedContentBlockDocumentBindingPath({
        binding: {
          type: "expression",
          value: `${encodeDataSourceVariable("document")}.frontmatter.title`,
          mode: "readwrite",
        },
        instanceSelector: ["heading", "block"],
        instances: new Map([
          [
            "block",
            {
              type: "instance",
              id: "block",
              component: blockComponent,
              children: [],
            },
          ],
        ]),
        props: new Map([
          [
            "document",
            {
              id: "document",
              instanceId: "block",
              name: contentBlockDocumentProp,
              type: "parameter",
              value: "document",
            },
          ],
        ]),
      })
    ).toBeUndefined();
  });

  test("classifies only connected direct document paths as readwrite", () => {
    const document = encodeDataSourceVariable("document");
    const block: Instance = {
      type: "instance",
      id: "block",
      component: blockComponent,
      children: [],
    };
    const instances = new Map([[block.id, block]]);
    const props = new Map<string, Prop>([
      [
        "source",
        {
          id: "source",
          instanceId: block.id,
          name: "src",
          type: "asset",
          value: "article",
        },
      ],
      [
        "document",
        {
          id: "document",
          instanceId: block.id,
          name: contentBlockDocumentProp,
          type: "parameter",
          value: "document",
        },
      ],
    ]);
    const context = {
      instanceSelector: ["heading", block.id],
      instances,
      props,
    };

    expect(
      getSelectedContentBlockExpressionMode({
        ...context,
        expression: `${document}.frontmatter.title`,
      })
    ).toBe("readwrite");
    expect(
      getSelectedContentBlockExpressionMode({
        ...context,
        expression: `${document}.frontmatter.title + "!"`,
      })
    ).toBe("read");
  });

  test("keeps bindings inside Templates read-only", () => {
    const document = encodeDataSourceVariable("document");
    const instances = new Map<string, Instance>([
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
          children: [{ type: "id", value: "heading" }],
        },
      ],
    ]);
    const props = new Map<string, Prop>([
      [
        "source",
        {
          id: "source",
          instanceId: "block",
          name: "src",
          type: "asset",
          value: "article",
        },
      ],
      [
        "document",
        {
          id: "document",
          instanceId: "block",
          name: contentBlockDocumentProp,
          type: "parameter",
          value: "document",
        },
      ],
    ]);

    expect(
      getSelectedContentBlockExpressionMode({
        expression: `${document}.frontmatter.title`,
        instanceSelector: ["heading", "templates", "block"],
        instances,
        props,
      })
    ).toBe("read");
  });

  test("does not write an outer document through a nested Content Block", () => {
    const outerDocument = encodeDataSourceVariable("outerDocument");
    const instances = new Map<string, Instance>([
      [
        "inner",
        {
          type: "instance",
          id: "inner",
          component: blockComponent,
          children: [{ type: "id", value: "heading" }],
        },
      ],
      [
        "outer",
        {
          type: "instance",
          id: "outer",
          component: blockComponent,
          children: [{ type: "id", value: "inner" }],
        },
      ],
    ]);
    const props = new Map<string, Prop>([
      [
        "outer-source",
        {
          id: "outer-source",
          instanceId: "outer",
          name: "src",
          type: "asset",
          value: "outer-article",
        },
      ],
      [
        "outer-document",
        {
          id: "outer-document",
          instanceId: "outer",
          name: contentBlockDocumentProp,
          type: "parameter",
          value: "outerDocument",
        },
      ],
    ]);

    expect(
      getSelectedContentBlockExpressionMode({
        expression: `${outerDocument}.frontmatter.title`,
        instanceSelector: ["heading", "inner", "outer"],
        instances,
        props,
        sourceBlockInstanceId: "outer",
        renderedBlockInstanceId: "outer",
      })
    ).toBe("read");
  });

  test("does not write through a referenced frontmatter value", () => {
    expect(
      isObjectPathWritable({
        value: { author: { $ref: "./author.mdx#frontmatter" } },
        path: ["author", "name"],
      })
    ).toBe(false);
    expect(
      isObjectPathWritable({
        value: { featureImage: { $ref: "./hero.png" } },
        path: ["featureImage"],
      })
    ).toBe(true);
  });

  test("updates a nested property without mutating its source", () => {
    const source = { author: { name: "Before", role: "Writer" } };
    expect(
      setObjectPathValue({
        value: source,
        path: ["author", "name"],
        nextValue: "After",
      })
    ).toEqual({ author: { name: "After", role: "Writer" } });
    expect(source.author.name).toBe("Before");
  });

  test("does not replace an existing scalar while traversing a nested path", () => {
    const source = { author: "Oleg" };

    expect(
      isObjectPathWritable({ value: source, path: ["author", "name"] })
    ).toBe(false);
    expect(() =>
      setObjectPathValue({
        value: source,
        path: ["author", "name"],
        nextValue: "Ada",
      })
    ).toThrow("Frontmatter object path is invalid");
    expect(source).toEqual({ author: "Oleg" });
  });

  test("updates an array item without changing the array shape", () => {
    const source = { authors: [{ name: "Before" }, { name: "Other" }] };
    const path = ["authors", "0", "name"];

    expect(isObjectPathWritable({ value: source, path })).toBe(true);
    expect(
      setObjectPathValue({ value: source, path, nextValue: "After" })
    ).toEqual({ authors: [{ name: "After" }, { name: "Other" }] });
    expect(source.authors[0].name).toBe("Before");
  });

  test("rejects invalid array indexes and unsafe object paths", () => {
    expect(
      isObjectPathWritable({ value: { authors: [] }, path: ["authors", "0"] })
    ).toBe(false);
    expect(
      isObjectPathWritable({ value: {}, path: ["__proto__", "polluted"] })
    ).toBe(false);
    expect(() =>
      setObjectPathValue({
        value: {},
        path: ["__proto__", "polluted"],
        nextValue: true,
      })
    ).toThrow("Frontmatter object path is invalid");
  });
});
