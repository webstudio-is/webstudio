import { test, expect, describe } from "vitest";
import { findCycles, breakCyclesMutable } from "./graph-utils";
import type { Instance } from "@webstudio-is/sdk";

const typeId = "id" as const;

describe("findCycles", () => {
  test("should return an empty array for an empty graph", () => {
    const graph: Instance[] = [];
    const result = findCycles(graph);
    expect(result).toEqual([]);
  });

  test("should return an empty array for a graph with no cycles", () => {
    const graph = [
      { id: "1", children: [{ type: typeId, value: "2" }] },
      { id: "2", children: [{ type: typeId, value: "3" }] },
      { id: "3", children: [] },
    ];
    const result = findCycles(graph);
    expect(result).toEqual([]);
  });

  test("should return a single cycle for a graph with one cycle", () => {
    const graph = [
      { id: "1", children: [{ type: typeId, value: "2" }] },
      { id: "2", children: [{ type: typeId, value: "3" }] },
      { id: "3", children: [{ type: typeId, value: "1" }] },
    ];
    const result = findCycles(graph);
    expect(result).toEqual([["1", "2", "3", "1"]]);
  });

  test("should return multiple cycles for a graph with multiple cycles", () => {
    const graph = [
      { id: "1", children: [{ type: typeId, value: "2" }] },
      {
        id: "2",
        children: [
          { type: typeId, value: "3" },
          { type: typeId, value: "4" },
        ],
      },
      { id: "3", children: [{ type: typeId, value: "1" }] },
      { id: "4", children: [{ type: typeId, value: "2" }] },
    ];
    const result = findCycles(graph);
    expect(result).toEqual([
      ["1", "2", "3", "1"],
      ["2", "4", "2"],
    ]);
  });

  test("should return multiple cycles for a graph with multiple inline cycles", () => {
    const graph = [
      { id: "1", children: [{ type: typeId, value: "2" }] },
      {
        id: "2",
        children: [{ type: typeId, value: "3" }],
      },
      {
        id: "3",
        children: [
          { type: typeId, value: "4" },
          { type: typeId, value: "2" },
        ],
      },
      { id: "4", children: [{ type: typeId, value: "1" }] },
    ];

    const result = findCycles(graph);

    expect(result).toEqual([
      ["1", "2", "3", "4", "1"],
      ["2", "3", "2"],
    ]);
  });
});

describe("breakCyclesMutable", () => {
  test("should return the same instances for an empty graph", () => {
    const result = breakCyclesMutable([], () => false);

    expect(result).toEqual([]);
  });

  test("should return the same instances for a graph with no cycles", () => {
    const instances = [
      { id: "1", component: "Slot", children: [{ type: typeId, value: "2" }] },
      { id: "2", children: [{ type: typeId, value: "3" }] },
      { id: "3", children: [] },
    ];
    const result = breakCyclesMutable(
      instances,
      (node) => node?.component === "Slot"
    );
    expect(result).toEqual(instances);
  });

  test("should break a single cycle in the graph", () => {
    const instances = [
      { id: "1", children: [{ type: typeId, value: "2" }] },
      { id: "2", children: [{ type: typeId, value: "3" }] },
      { id: "3", component: "Slot", children: [{ type: typeId, value: "1" }] },
    ];

    const result = breakCyclesMutable(
      instances,
      (node) => node?.component === "Slot"
    );

    expect(result).toEqual([
      { id: "1", children: [{ type: typeId, value: "2" }] },
      { id: "2", children: [] },
      { id: "3", component: "Slot", children: [{ type: typeId, value: "1" }] },
    ]);
  });

  test("should break multiple cycles in the graph", () => {
    const instances = [
      { id: "1", children: [{ type: typeId, value: "2" }] },
      {
        id: "2",
        children: [
          { type: typeId, value: "3" },
          { type: typeId, value: "4" },
        ],
      },
      { id: "3", component: "Slot", children: [{ type: typeId, value: "1" }] },
      { id: "4", component: "Slot", children: [{ type: typeId, value: "2" }] },
    ];

    const result = breakCyclesMutable(
      instances,
      (node) => node?.component === "Slot"
    );
    expect(result).toEqual([
      { id: "1", children: [{ type: typeId, value: "2" }] },
      {
        id: "2",
        children: [],
      },
      { id: "3", component: "Slot", children: [{ type: typeId, value: "1" }] },
      { id: "4", component: "Slot", children: [{ type: typeId, value: "2" }] },
    ]);
  });
});
