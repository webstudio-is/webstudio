import { describe, expect, test } from "vitest";
import { selectRepresentativeViewports } from "./viewports";

describe("selectRepresentativeViewports", () => {
  test("selects common viewports nearest the middle of bounded ranges", () => {
    expect(
      selectRepresentativeViewports({
        ranges: [
          { minimumWidth: 1, maximumWidth: 479, purpose: "portrait" },
          { minimumWidth: 480, maximumWidth: 767, purpose: "landscape" },
          { minimumWidth: 768, maximumWidth: 991, purpose: "tablet" },
          { minimumWidth: 1280, purpose: "desktop" },
        ],
      })
    ).toEqual([
      { width: 390, height: 844, purposes: ["portrait"] },
      { width: 667, height: 375, purposes: ["landscape"] },
      { width: 820, height: 1180, purposes: ["tablet"] },
      { width: 1366, height: 768, purposes: ["desktop"] },
    ]);
  });

  test("uses range boundaries and merges purposes when no candidate is available", () => {
    expect(
      selectRepresentativeViewports({
        ranges: [
          { minimumWidth: 200, maximumWidth: 300, purpose: "first" },
          { minimumWidth: 250, maximumWidth: 300, purpose: "second" },
          { minimumWidth: 200, maximumWidth: 300, purpose: "first" },
          { minimumWidth: 2100, purpose: "wide" },
        ],
      })
    ).toEqual([
      { width: 300, height: 844, purposes: ["first", "second"] },
      { width: 2100, height: 900, purposes: ["wide"] },
    ]);
  });

  test("selects deterministically without mutating caller-provided candidates", () => {
    const candidates = [
      { width: 900, height: 600 },
      { width: 500, height: 700 },
    ];
    const selected = selectRepresentativeViewports({
      ranges: [{ minimumWidth: 400, maximumWidth: 1000, purpose: "bounded" }],
      candidates,
    });
    expect(selected).toEqual([
      { width: 500, height: 700, purposes: ["bounded"] },
    ]);
    expect(candidates.map(({ width }) => width)).toEqual([900, 500]);
  });
});
