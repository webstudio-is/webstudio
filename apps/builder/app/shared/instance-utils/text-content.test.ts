import { describe, expect, test } from "vitest";
import type { Instance } from "@webstudio-is/sdk";
import {
  createTextContentUpdatePayload,
  createTextContentChild,
  findTextContentChild,
  getTextContentChild,
  getTextContentErrors,
  isTextContentChild,
  serializeTextNodes,
  setTextContentMutable,
} from "./text-content";

describe("text content utils", () => {
  test("creates text and expression children", () => {
    expect(createTextContentChild({ type: "text", value: "Hello" })).toEqual({
      type: "text",
      value: "Hello",
    });
    expect(
      createTextContentChild({ type: "expression", value: "title" })
    ).toEqual({
      type: "expression",
      value: "title",
    });
  });

  test("validates only expression children", () => {
    expect(
      getTextContentErrors({ type: "text", value: "invalid expression {" })
    ).toEqual([]);
    expect(
      getTextContentErrors({ type: "expression", value: "invalid {" })
    ).not.toEqual([]);
  });

  test("detects text content children", () => {
    expect(isTextContentChild({ type: "text", value: "Hello" })).toBe(true);
    expect(isTextContentChild({ type: "expression", value: "title" })).toBe(
      true
    );
    expect(isTextContentChild({ type: "id", value: "child" })).toBe(false);
    expect(isTextContentChild(undefined)).toBe(false);
  });

  test("gets text content child by index", () => {
    const instance: Instance = {
      type: "instance",
      id: "instance",
      component: "Text",
      children: [
        { type: "id", value: "child" },
        { type: "text", value: "Hello" },
      ],
    };

    expect(getTextContentChild(instance, 0)).toBeUndefined();
    expect(getTextContentChild(instance, 1)).toEqual({
      type: "text",
      value: "Hello",
    });
  });

  test("finds text content children with explicit status", () => {
    const instances: Instance[] = [
      {
        type: "instance",
        id: "instance",
        component: "Text",
        children: [
          { type: "id", value: "child" },
          { type: "text", value: "Hello" },
        ],
      },
    ];

    expect(
      findTextContentChild(instances, {
        instanceId: "instance",
        childIndex: 1,
        mode: "text",
      })
    ).toEqual({
      status: "found",
      child: { type: "text", value: "Hello" },
    });
    expect(
      findTextContentChild(instances, {
        instanceId: "missing",
        childIndex: 1,
      })
    ).toEqual({ status: "instance-not-found" });
    expect(
      findTextContentChild(instances, {
        instanceId: "instance",
        childIndex: 2,
      })
    ).toEqual({ status: "child-not-found" });
    expect(
      findTextContentChild(instances, {
        instanceId: "instance",
        childIndex: 0,
      })
    ).toEqual({ status: "not-text-content" });
    expect(
      findTextContentChild(instances, {
        instanceId: "instance",
        childIndex: 1,
        mode: "expression",
      })
    ).toEqual({ status: "mode-mismatch", actual: "text" });
  });

  test("replaces instance children with a single text content child", () => {
    const instance: Instance = {
      type: "instance",
      id: "instance",
      component: "Text",
      children: [{ type: "text", value: "old" }],
    };

    setTextContentMutable(instance, "expression", "value");

    expect(instance.children).toEqual([{ type: "expression", value: "value" }]);
  });

  test("creates text content update payload", () => {
    expect(
      createTextContentUpdatePayload({
        instanceId: "instance",
        childIndex: 1,
        child: { type: "text", value: "Hello" },
      })
    ).toEqual([
      {
        namespace: "instances",
        patches: [
          {
            op: "replace",
            path: ["instance", "children", 1],
            value: { type: "text", value: "Hello" },
          },
        ],
      },
    ]);
  });

  test("serializes text and expression children with filters", () => {
    const instances: Instance[] = [
      {
        type: "instance",
        id: "root",
        component: "Body",
        children: [
          { type: "text", value: "Hello world" },
          { type: "id", value: "child" },
        ],
      },
      {
        type: "instance",
        id: "child",
        component: "Text",
        label: "Label",
        children: [{ type: "expression", value: "greeting" }],
      },
      {
        type: "instance",
        id: "outside",
        component: "Text",
        children: [{ type: "text", value: "Outside" }],
      },
    ];

    expect(
      serializeTextNodes({
        instances,
        rootInstanceIds: new Set(["root", "child"]),
        mode: "all",
        maxValueLength: 5,
      })
    ).toEqual([
      {
        instanceId: "root",
        childIndex: 0,
        component: "Body",
        label: undefined,
        mode: "text",
        value: "Hello",
      },
      {
        instanceId: "child",
        childIndex: 0,
        component: "Text",
        label: "Label",
        mode: "expression",
        value: "greet",
      },
    ]);

    expect(
      serializeTextNodes({
        instances,
        instanceId: "root",
        mode: "text",
        contains: "world",
      })
    ).toEqual([
      {
        instanceId: "root",
        childIndex: 0,
        component: "Body",
        label: undefined,
        mode: "text",
        value: "Hello world",
      },
    ]);
  });
});
