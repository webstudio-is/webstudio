// Verifies the privacy-preserving request fingerprints consumed by evaluation
// outcome validation, including strict shapes and stable object-key ordering.
import { describe, expect, test } from "vitest";
import {
  getAssetQueryContractFingerprints,
  getPageSettingsContractFingerprint,
} from "./evaluation-trace-contract";

const createQuery = (value: unknown) => ({
  where: {
    all: [
      {
        field: ["properties", "slug"],
        operator: "eq",
        value,
      },
    ],
  },
  output: { mode: "base", includeMetadata: true },
});

describe("evaluation trace contracts", () => {
  test("fingerprints asset queries independently of object key order", () => {
    const query = createQuery({ first: "one", second: "two" });
    const reordered = createQuery({ second: "two", first: "one" });

    expect(getAssetQueryContractFingerprints(reordered)).toEqual(
      getAssetQueryContractFingerprints(query)
    );
  });

  test("separates exact query values from the query shape", () => {
    const first = getAssetQueryContractFingerprints(createQuery("first-post"));
    const second = getAssetQueryContractFingerprints(
      createQuery("second-post")
    );

    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(first?.sha256).not.toBe(second?.sha256);
    expect(first?.shapeSha256).toBe(second?.shapeSha256);
  });

  test("rejects invalid asset queries", () => {
    expect(
      getAssetQueryContractFingerprints({ where: { unknown: [] } })
    ).toBeUndefined();
  });

  test("accepts only the exact page settings contract", () => {
    const input = {
      pageId: "blog-detail",
      values: {
        title: "Article",
        meta: {
          description: "Description",
          socialImageUrl: "/social.png",
          status: "200",
        },
      },
    };
    const reordered = {
      values: {
        meta: {
          status: input.values.meta.status,
          socialImageUrl: input.values.meta.socialImageUrl,
          description: input.values.meta.description,
        },
        title: input.values.title,
      },
      pageId: input.pageId,
    };

    expect(getPageSettingsContractFingerprint(reordered)).toBe(
      getPageSettingsContractFingerprint(input)
    );
    expect(
      getPageSettingsContractFingerprint({ ...input, unexpected: true })
    ).toBeUndefined();
  });
});
