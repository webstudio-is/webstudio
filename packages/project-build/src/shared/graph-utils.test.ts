// graph-utils.test.ts
import { test, expect, describe } from "@jest/globals";
import { findCycles } from "./graph-utils";
import type { Instance } from "@webstudio-is/sdk";

describe("findCycles", () => {
  test("should return an empty array for an empty graph", () => {
    const graph: Instance[] = [];
    const result = findCycles(graph);
    expect(result).toEqual([]);
  });

  test("should return an empty array for a graph with no cycles", () => {
    const graph = [
      { id: "1", children: [{ type: "id" as const, value: "2" }] },
      { id: "2", children: [{ type: "id" as const, value: "3" }] },
      { id: "3", children: [] },
    ];
    const result = findCycles(graph);
    expect(result).toEqual([]);
  });

  test("should return a single cycle for a graph with one cycle", () => {
    const graph = [
      { id: "1", children: [{ type: "id" as const, value: "2" }] },
      { id: "2", children: [{ type: "id" as const, value: "3" }] },
      { id: "3", children: [{ type: "id" as const, value: "1" }] },
    ];
    const result = findCycles(graph);
    expect(result).toEqual([["1", "2", "3", "1"]]);
  });

  test("should return multiple cycles for a graph with multiple cycles", () => {
    const graph = [
      { id: "1", children: [{ type: "id" as const, value: "2" }] },
      {
        id: "2",
        children: [
          { type: "id" as const, value: "3" },
          { type: "id" as const, value: "4" },
        ],
      },
      { id: "3", children: [{ type: "id" as const, value: "1" }] },
      { id: "4", children: [{ type: "id" as const, value: "2" }] },
    ];
    const result = findCycles(graph);
    expect(result).toEqual([
      ["1", "2", "3", "1"],
      ["2", "4", "2"],
    ]);
  });
});
