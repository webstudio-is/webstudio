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
      selection: { mode: "full" },
    };

    const source = codec.format(query);
    expect(codec.parse(source)).toEqual({ success: true, value: query });
  });

  test("validates declarative source parameters without a provider parser", () => {
    const codec = createQuerySourceCodec<
      "string" | "date",
      "eq" | "after",
      GenericQuery
    >(genericQueryCapabilities);
    const invalid = `{
      query: {
        where: { all: [] },
        sort: [],
        limit: 10,
        offset: 0,
        selection: { mode: "unsupported" },
      },
    }`;

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
    const source = `{
      query: {
        where: { all: [] },
        sort: [],
        limit: 10,
        offset: 0,
      },
    }`;

    expect(codec.parse(source)).toEqual({
      success: true,
      value: {
        where: { all: [] },
        sort: [],
        limit: "10",
        offset: "0",
        selection: { mode: "summary" },
      },
    });
  });

  test("rejects source features disabled by capabilities", () => {
    const capabilities = {
      ...genericQueryCapabilities,
      features: {
        ...genericQueryCapabilities.features,
        sort: false,
        limit: false,
        offset: false,
      },
      limits: { ...genericQueryCapabilities.limits, sortFields: 0 },
    } as const;
    const codec = createQuerySourceCodec(capabilities);
    const source = `{
      query: {
        where: { all: [] },
        sort: [{ field: ["title"], direction: "asc" }],
        limit: 20,
        offset: 10,
        selection: { mode: "summary" },
      },
    }`;

    expect(codec.parse(source).success).toBe(false);
  });
});
