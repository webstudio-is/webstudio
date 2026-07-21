import { describe, expect, test } from "vitest";
import { computeExpression } from "@webstudio-is/project-build/runtime";
import {
  createAssetQueryResourceBody,
  getAssetIndexStatusLabel,
  getAssetFileTypeGroqPredicate,
  getAssetQueryConfigurationError,
  isEmptyAssetQueryResult,
  normalizeAssetQueryParameterBindings,
  parseAssetQueryResourceBody,
} from "./asset-query-form-utils";

describe("asset query resource body", () => {
  test("preserves runtime parameter bindings as expressions", () => {
    const body = createAssetQueryResourceBody({
      query: "*[properties.slug == $slug]",
      parameters: [
        { name: "slug", value: "$ws$dataSource$routeSlug" },
        { name: "locale", value: '"en"' },
      ],
      resultLimit: 1,
    });

    expect(
      computeExpression(body, new Map([["routeSlug", "hello-world"]]))
    ).toEqual({
      query: "*[properties.slug == $slug]",
      parameters: { slug: "hello-world", locale: "en" },
      resultLimit: 1,
      content: { mode: "none" },
    });
    expect(parseAssetQueryResourceBody(body)).toEqual({
      queryExpression: '"*[properties.slug == $slug]"',
      resultLimitExpression: "1",
      contentExpression: '{ "mode": "none" }',
      parameters: [
        { name: "slug", value: "$ws$dataSource$routeSlug" },
        { name: "locale", value: '"en"' },
      ],
    });
  });

  test("serializes result and selected-file hydration limits", () => {
    const body = createAssetQueryResourceBody({
      query: "*[0]{_id, revision, contentRef}",
      parameters: [],
      resultLimit: 1,
      contentExpression: JSON.stringify({
        mode: "range",
        offset: 100,
        length: 500,
      }),
    });

    expect(computeExpression(body, new Map())).toEqual({
      query: "*[0]{_id, revision, contentRef}",
      parameters: {},
      resultLimit: 1,
      content: { mode: "range", offset: 100, length: 500 },
    });
    expect(parseAssetQueryResourceBody(body)).toMatchObject({
      resultLimitExpression: "1",
      contentExpression: '{"mode":"range","offset":100,"length":500}',
    });
  });

  test("classifies index and empty-result preview states", () => {
    const base = {
      resourceId: "posts",
      queryHash: "query-revision",
      assetRevision: "asset-revision",
      updatedAt: "2026-07-18T12:00:00.000Z",
    };
    expect(getAssetIndexStatusLabel(undefined)).toContain("No index");
    expect(getAssetIndexStatusLabel({ ...base, state: "indexing" })).toContain(
      "first index"
    );
    expect(getAssetIndexStatusLabel({ ...base, state: "stale" })).toContain(
      "stale"
    );
    expect(getAssetIndexStatusLabel({ ...base, state: "failed" })).toContain(
      "failed"
    );
    expect(
      getAssetIndexStatusLabel({
        ...base,
        state: "active",
        activeRevision: "active-revision",
      })
    ).toContain("active");
    expect(isEmptyAssetQueryResult([])).toBe(true);
    expect(isEmptyAssetQueryResult(null)).toBe(true);
    expect(isEmptyAssetQueryResult({})).toBe(false);
  });

  test("file-type helpers produce visible GROQ source", () => {
    expect(getAssetFileTypeGroqPredicate("md")).toBe('extension == "md"');
  });

  test("normalizes runtime parameter names without changing expressions", () => {
    expect(
      normalizeAssetQueryParameterBindings([
        { name: "  slug  ", value: "system.params.slug" },
      ])
    ).toEqual([{ name: "slug", value: "system.params.slug" }]);
  });

  test("rejects invalid and duplicate query options before saving", () => {
    expect(
      getAssetQueryConfigurationError({
        query: "*[]",
        parameters: [{ name: "slug" }, { name: "slug" }],
        resultLimit: 1,
        content: { mode: "none" },
      })
    ).toContain("unique");
    expect(
      getAssetQueryConfigurationError({
        query: "*[]",
        parameters: [],
        resultLimit: 0,
        content: { mode: "none" },
      })
    ).toContain("Result limit");
    expect(
      getAssetQueryConfigurationError({
        query: "*[properties.slug == $slug]",
        parameters: [{ name: "slug" }],
        resultLimit: 1,
        content: { mode: "range", offset: 0, length: 10 },
      })
    ).toBeUndefined();
    expect(
      getAssetQueryConfigurationError({
        query: "*[properties.slug == $slug]",
        parameters: [{ name: "  slug  " }],
        resultLimit: 1,
        content: { mode: "none" },
      })
    ).toBeUndefined();
    expect(
      getAssetQueryConfigurationError({
        query: "*[properties.slug == $slug]",
        parameters: [],
        resultLimit: 1,
        content: { mode: "none" },
      })
    ).toContain("$slug");
  });
});
