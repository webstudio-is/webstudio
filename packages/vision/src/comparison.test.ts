import { expect, test } from "vitest";
import { getInitialCaptureTarget, getVisualComparisons } from "./comparison";

const createEntry = (id: string) => ({ id, title: id, name: id });

test("classifies common, added, and removed visual entries", () => {
  expect(
    getVisualComparisons({
      baselineEntries: {
        shared: createEntry("shared"),
        removed: createEntry("removed"),
      },
      currentEntries: {
        shared: createEntry("shared"),
        added: createEntry("added"),
      },
    })
  ).toEqual([
    {
      baseline: undefined,
      current: createEntry("added"),
      id: "added",
      status: "added",
    },
    {
      baseline: createEntry("removed"),
      current: undefined,
      id: "removed",
      status: "removed",
    },
    {
      baseline: createEntry("shared"),
      current: createEntry("shared"),
      id: "shared",
      status: "comparable",
    },
  ]);
});

test("does not initialize a browser for cached removed entries", () => {
  expect(
    getInitialCaptureTarget({
      baselineEntries: [createEntry("removed")],
      currentEntries: [],
      hasCachedBaseline: true,
    })
  ).toBeUndefined();
});
