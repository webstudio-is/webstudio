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
});
