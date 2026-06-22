import { describe, expect, test } from "vitest";
import { __testing__ } from "./import-redirects-dialog";

const { splitDuplicateRedirects, splitRedirectsForMergeMode } = __testing__;

describe("splitDuplicateRedirects", () => {
  test("skips redirects that duplicate existing sources after normalization", () => {
    const result = splitDuplicateRedirects(
      [
        { old: "/%C3%BCber", new: "/new" },
        { old: "/fresh", new: "/fresh-new" },
      ],
      [{ old: "/über" }]
    );

    expect(result.unique).toEqual([{ old: "/fresh", new: "/fresh-new" }]);
    expect(result.duplicates).toEqual([{ old: "/%C3%BCber", new: "/new" }]);
  });

  test("skips duplicate sources within the imported batch", () => {
    const result = splitDuplicateRedirects(
      [
        { old: "/old#one", new: "/one" },
        { old: "/old#two", new: "/two" },
        { old: "/path?x=1", new: "/query-one" },
        { old: "/path?x=2", new: "/query-two" },
      ],
      []
    );

    expect(result.unique).toEqual([
      { old: "/old#one", new: "/one" },
      { old: "/path?x=1", new: "/query-one" },
      { old: "/path?x=2", new: "/query-two" },
    ]);
    expect(result.duplicates).toEqual([{ old: "/old#two", new: "/two" }]);
  });
});

describe("splitRedirectsForMergeMode", () => {
  test("add mode skips redirects that duplicate existing sources", () => {
    const result = splitRedirectsForMergeMode(
      [
        { old: "/%C3%BCber", new: "/new" },
        { old: "/fresh", new: "/fresh-new" },
      ],
      [{ old: "/über" }],
      "add"
    );

    expect(result.unique).toEqual([{ old: "/fresh", new: "/fresh-new" }]);
    expect(result.duplicates).toEqual([{ old: "/%C3%BCber", new: "/new" }]);
  });

  test("replace mode ignores existing redirects but skips duplicate imported sources", () => {
    const result = splitRedirectsForMergeMode(
      [
        { old: "/%C3%BCber", new: "/new" },
        { old: "/old#one", new: "/one" },
        { old: "/old#two", new: "/two" },
      ],
      [{ old: "/über" }],
      "replace"
    );

    expect(result.unique).toEqual([
      { old: "/%C3%BCber", new: "/new" },
      { old: "/old#one", new: "/one" },
    ]);
    expect(result.duplicates).toEqual([{ old: "/old#two", new: "/two" }]);
  });
});
