import { describe, expect, test } from "vitest";
import {
  craftSnapshotProvenance,
  createCraftReviewedDifferenceTable,
  createUnverifiedCraftProvenance,
  hashCraftSnapshot,
  normalizeCraftSnapshot,
  normalizeCraftSnapshotText,
} from "./craft-snapshot-provenance";

describe("Craft snapshot provenance", () => {
  test("normalizes text and JSON without mutating the input", () => {
    const input = {
      z: "e\u0301  \r\n",
      password: "do-not-retain",
      authToken: "also-do-not-retain",
      url: "https://example.com/?authToken=private-token&mode=design",
      a: [{ authorization: "Bearer private" }, -0, Number.NaN, undefined],
    };
    const before = structuredClone(input);

    expect(normalizeCraftSnapshotText("\uFEFFa  \r\nb\t")).toBe("a\nb");
    expect(normalizeCraftSnapshot(input)).toEqual({
      a: [{ authorization: "[REDACTED]" }, 0, null, null],
      authToken: "[REDACTED]",
      password: "[REDACTED]",
      url: "https://example.com/?authToken=[REDACTED]&mode=design",
      z: "é\n",
    });
    expect(input).toEqual(before);
  });

  test("hashes equivalent normalized snapshots identically", async () => {
    const left = await hashCraftSnapshot({ b: "x\r\n", a: 1 });
    const right = await hashCraftSnapshot({ a: 1, b: "x\n" });

    expect(left).toBe(right);
    expect(left).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  test("sorts and hashes the reviewed difference table deterministically", async () => {
    const rows = [
      {
        path: "tokens.container.gap",
        kind: "changed" as const,
        officialValue: "var(--gap-m)",
        profileValue: "var(--gap-l)",
        review: "Intentional local override",
      },
      {
        path: "variables.--focus-width",
        kind: "missing" as const,
        officialValue: "captured value",
        profileValue: null,
        review: "Not represented by this profile",
      },
    ];

    const forward = await createCraftReviewedDifferenceTable(rows);
    const reverse = await createCraftReviewedDifferenceTable(
      [...rows].reverse()
    );

    expect(reverse).toEqual(forward);
    expect(forward.rows.map(({ path }) => path)).toEqual([
      "tokens.container.gap",
      "variables.--focus-width",
    ]);

    await expect(
      createCraftReviewedDifferenceTable([rows[0], rows[0]])
    ).rejects.toThrow("Reviewed Craft difference paths must be unique");
  });

  test("represents missing official evidence explicitly", async () => {
    const provenance = await createUnverifiedCraftProvenance(
      "https://docs.webstudio.is/university/craft"
    );

    expect(craftSnapshotProvenance.parse(provenance)).toEqual(provenance);
    expect(provenance).toMatchObject({
      authentication: "unverified",
      official: { projectId: null, buildId: null, version: null },
      capture: { capturedAt: null, snapshotHash: null },
      docs: { capturedAt: null, contentHash: null },
      reviewedDifferences: { reviewedAt: null, rows: [] },
    });
  });
});
