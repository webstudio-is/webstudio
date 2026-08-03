import { describe, expect, test } from "vitest";
import type { Instance } from "@webstudio-is/sdk";
import { classifyInstanceContent } from "./content";

const createInstance = (
  children: Instance["children"],
  overrides: Partial<Instance> = {}
): Instance => ({
  type: "instance",
  id: "parent",
  component: "ws:element",
  tag: "span",
  children,
  ...overrides,
});

const nested = createInstance([], {
  id: "nested",
  component: "ws:element",
  tag: "strong",
  label: "Emphasis",
});

const instances = new Map([[nested.id, nested]]);

describe("classifyInstanceContent", () => {
  test.each([
    [[], "simple"],
    [[{ type: "text", value: "Hello" }], "simple"],
    [[{ type: "expression", value: "name" }], "simple"],
    [
      [
        { type: "text", value: "Hello" },
        { type: "text", value: " world" },
      ],
      "parts",
    ],
    [
      [
        { type: "text", value: " · " },
        { type: "expression", value: 'readTime ?? ""' },
      ],
      "parts",
    ],
    [
      [
        { type: "text", value: "Hello " },
        { type: "id", value: "nested" },
        { type: "text", value: "!" },
      ],
      "parts",
    ],
    [
      [
        { type: "expression", value: "before" },
        { type: "id", value: "nested" },
        { type: "expression", value: "after" },
      ],
      "parts",
    ],
    [[{ type: "id", value: "nested" }], "instances-only"],
  ] satisfies Array<[Instance["children"], string]>)(
    "classifies %# as %s",
    (children, type) => {
      expect(
        classifyInstanceContent({
          instance: createInstance(children),
          instances,
          supported: true,
        }).type
      ).toBe(type);
    }
  );

  test("returns ordered parts with explicit primitive indexes and instance metadata", () => {
    expect(
      classifyInstanceContent({
        instance: createInstance([
          { type: "text", value: "" },
          { type: "id", value: "nested" },
          { type: "expression", value: "name" },
        ]),
        instances,
        supported: true,
      })
    ).toEqual({
      type: "parts",
      instanceId: "parent",
      parts: [
        { type: "text", childIndex: 0, value: "" },
        {
          type: "instance",
          childIndex: 1,
          instanceId: "nested",
          component: "ws:element",
          label: "Emphasis",
        },
        { type: "expression", childIndex: 2, value: "name" },
      ],
    });
  });

  test("classifies content-incompatible instances as unsupported", () => {
    expect(
      classifyInstanceContent({
        instance: createInstance([{ type: "text", value: "hidden" }], {
          tag: "img",
        }),
        instances,
        supported: false,
      })
    ).toEqual({ type: "unsupported" });
  });
});
