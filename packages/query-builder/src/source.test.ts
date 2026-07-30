import { describe, expect, test } from "vitest";
import { createQuerySourceCodec } from "./source";
import { genericQueryCapabilities, type GenericQuery } from "./test-fixtures";

describe("structured query source", () => {
  test("round-trips a provider-neutral query solely from capabilities", () => {
    const codec = createQuerySourceCodec<
      "string" | "date",
      "eq" | "after",
      GenericQuery
    >(genericQueryCapabilities);
    const query: GenericQuery = {
      where: {
        any: [
          { field: ["title"], operator: "eq", value: "system.params.title" },
          {
            field: ["publishedAt"],
            operator: "after",
            value: '"2026-01-01"',
          },
        ],
      },
      sort: [{ field: ["publishedAt"], direction: "desc" }],
      limit: "pageSize ?? 10",
      offset: "0",
      selection: { mode: "full", includeMetadata: true },
    };

    const source = codec.format(query);
    expect(source.startsWith("({\n")).toBe(true);
    expect(source.endsWith("})")).toBe(true);
    expect(source).not.toContain("query:");
    expect(codec.parse(source)).toEqual({ success: true, value: query });
  });

  test("validates declarative source parameters without a provider parser", () => {
    const codec = createQuerySourceCodec<
      "string" | "date",
      "eq" | "after",
      GenericQuery
    >(genericQueryCapabilities);
    const invalid = `({
      where: { all: [] },
      sort: [],
      limit: 10,
      offset: 0,
      selection: { mode: "unsupported", includeMetadata: true },
    })`;

    expect(codec.parse(invalid)).toEqual({
      success: false,
      message: "Enter a valid selection.",
    });
  });

  test("uses capability defaults when a newly introduced parameter is absent", () => {
    const codec = createQuerySourceCodec<
      "string" | "date",
      "eq" | "after",
      GenericQuery
    >(genericQueryCapabilities);
    const source = `({
      where: { all: [] },
      sort: [],
      limit: 10,
      offset: 0,
    })`;

    expect(codec.parse(source)).toEqual({
      success: true,
      value: {
        where: { all: [] },
        sort: [],
        limit: "10",
        offset: "0",
        selection: { mode: "summary", includeMetadata: true },
      },
    });
  });

  test("rejects invalid and non-object query source", () => {
    const codec = createQuerySourceCodec(genericQueryCapabilities);

    expect(codec.parse("invalid").success).toBe(false);
    expect(codec.parse("[]").success).toBe(false);
    expect(codec.parse("({})").success).toBe(true);
  });

  test("uses only the controls declared by the provider", () => {
    const capabilities = {
      ...genericQueryCapabilities,
      source: {
        ...genericQueryCapabilities.source,
        controls: [
          {
            type: "expression",
            key: "pageSize",
            label: "Page size",
            defaultValue: "25",
            input: "number",
          },
        ],
      },
    } as const;
    const codec = createQuerySourceCodec(capabilities);
    expect(codec.parse("({ pageSize: 50 })")).toEqual({
      success: true,
      value: { pageSize: "50" },
    });
    expect(codec.parse("({ limit: 50 })").success).toBe(false);
  });

  test("preserves unknown fields while validating known field operators", () => {
    const codec = createQuerySourceCodec<
      "string" | "date",
      "eq" | "after",
      GenericQuery
    >(genericQueryCapabilities);
    const source = (field: string, operator: string) => `({
      where: { field: [${JSON.stringify(field)}], operator: ${JSON.stringify(operator)}, value: "value" },
      sort: [],
      limit: 10,
      offset: 0,
    })`;

    expect(codec.parse(source("unknown", "eq")).success).toBe(true);
    expect(codec.parse(source("title", "after")).success).toBe(false);
    expect(
      codec.parse(`({
        where: { all: [] },
        sort: [{ field: ["unknown"], direction: "asc" }],
        limit: 10,
        offset: 0,
      })`).success
    ).toBe(true);
  });

  test("uses provider-defined sort directions", () => {
    const capabilities = {
      ...genericQueryCapabilities,
      source: {
        ...genericQueryCapabilities.source,
        controls: genericQueryCapabilities.source.controls.map((control) =>
          control.type === "sort"
            ? {
                ...control,
                defaultItem: {
                  ...control.defaultItem,
                  direction: "newest",
                },
                directions: [
                  { value: "newest", label: "Newest first" },
                  { value: "oldest", label: "Oldest first" },
                ],
              }
            : control
        ),
      },
    } as const;
    const codec = createQuerySourceCodec(capabilities);
    const source = (direction: string) => `({
      where: { all: [] },
      sort: [{ field: ["publishedAt"], direction: ${JSON.stringify(direction)} }],
      limit: 10,
      offset: 0,
    })`;

    expect(codec.parse(source("newest")).success).toBe(true);
    expect(codec.parse(source("desc")).success).toBe(false);
  });

  test("honors the operator allowlist of a known field", () => {
    const capabilities = {
      ...genericQueryCapabilities,
      fields: genericQueryCapabilities.fields.map((field) =>
        field.path[0] === "publishedAt"
          ? { ...field, operators: ["eq"] as const }
          : field
      ),
    } as const;
    const codec = createQuerySourceCodec<
      "string" | "date",
      "eq" | "after",
      GenericQuery
    >(capabilities);
    const query: GenericQuery = {
      where: {
        field: ["publishedAt"],
        operator: "after",
        value: '"2026-01-01"',
      },
      sort: [],
      limit: "10",
      offset: "0",
      selection: { mode: "summary", includeMetadata: true },
    };

    expect(
      codec.parse(
        codec.format({
          ...query,
          where: { ...query.where, operator: "eq" },
        })
      ).success
    ).toBe(true);
    expect(() => codec.format(query)).toThrow("Query condition is invalid");
    expect(
      codec.parse(`({
        where: { field: ["publishedAt"], operator: "after", value: "2026-01-01" },
        sort: [],
        limit: 10,
        offset: 0,
      })`).success
    ).toBe(false);
  });

  test("validates static number expressions while allowing dynamic values", () => {
    const capabilities = {
      ...genericQueryCapabilities,
      source: {
        ...genericQueryCapabilities.source,
        controls: genericQueryCapabilities.source.controls.map((control) =>
          control.type === "expression" && control.key === "limit"
            ? { ...control, min: 1, max: 100, integer: true }
            : control
        ),
      },
    } as const;
    const codec = createQuerySourceCodec(capabilities);
    const source = (limit: string) => `({
      where: { all: [] },
      sort: [],
      limit: ${limit},
      offset: 0,
    })`;

    expect(codec.parse(source("20")).success).toBe(true);
    expect(codec.parse(source("pageSize ?? 20")).success).toBe(true);
    expect(codec.parse(source("20.5")).success).toBe(false);
    expect(codec.parse(source("0")).success).toBe(false);
    expect(codec.parse(source("101")).success).toBe(false);
    expect(codec.parse(source('"20"')).success).toBe(false);
    expect(codec.parse(source("null")).success).toBe(false);
  });

  test("validates exclusive number bounds", () => {
    const capabilities = {
      ...genericQueryCapabilities,
      source: {
        ...genericQueryCapabilities.source,
        controls: genericQueryCapabilities.source.controls.map((control) =>
          control.type === "expression" && control.key === "limit"
            ? {
                ...control,
                min: 0.5,
                max: 1.5,
                exclusiveMin: true,
                exclusiveMax: true,
              }
            : control
        ),
      },
    } as const;
    const codec = createQuerySourceCodec(capabilities);
    const source = (limit: string) => `({
      where: { all: [] },
      sort: [],
      limit: ${limit},
      offset: 0,
    })`;

    expect(codec.parse(source("1")).success).toBe(true);
    expect(codec.parse(source("0.5")).success).toBe(false);
    expect(codec.parse(source("1.5")).success).toBe(false);
  });
});
