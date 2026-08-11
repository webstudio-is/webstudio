import { expect, test } from "vitest";
import { getVisualComparisons } from "./comparison";

const createEntry = (id: string) => ({ id, title: id, name: id });

test("classifies common, added, and removed visual entries", () => {
  expect(
    getVisualComparisons({
      baselineEntries: [createEntry("shared"), createEntry("removed")],
      currentEntries: [createEntry("shared"), createEntry("added")],
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

test("rejects duplicate visual entry ids", () => {
  expect(() =>
    getVisualComparisons({
      baselineEntries: [createEntry("duplicate"), createEntry("duplicate")],
      currentEntries: [],
    })
  ).toThrowError('Duplicate baseline visual entry id: "duplicate"');
});
