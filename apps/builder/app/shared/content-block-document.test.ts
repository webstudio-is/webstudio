import { describe, expect, test } from "vitest";
import {
  getSelectedContentBlockDocumentBindingPath,
  isObjectPathWritable,
  setObjectPathValue,
} from "./content-block-document";
import {
  blockComponent,
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
        expression: `${encodeDataSourceVariable("innerDocument")}.frontmatter.title`,
        instanceSelector: ["heading", "outer"],
        instances,
        props,
        sourceBlockInstanceId: "inner",
      })
    ).toEqual(["title"]);
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
