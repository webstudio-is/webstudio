import { expect, test } from "vitest";
import type { Instance } from "@webstudio-is/sdk";
import { getEditableTextChildIndex } from "./text-content-utils";

const createInstance = (children: Instance["children"]): Instance => ({
  type: "instance",
  id: "reading-time",
  component: "ws:element",
  tag: "span",
  children,
});

test("targets the existing binding among surrounding static text", () => {
  expect(
    getEditableTextChildIndex(
      createInstance([
        { type: "text", value: " · " },
        { type: "expression", value: 'readTime ?? ""' },
      ])
    )
  ).toBe(1);
});

test("does not collapse content with nested instances into a text field", () => {
  expect(
    getEditableTextChildIndex(
      createInstance([
        { type: "text", value: "prefix" },
        { type: "id", value: "nested" },
      ])
    )
  ).toBeUndefined();
});
