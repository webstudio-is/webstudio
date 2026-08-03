import { expect, test } from "vitest";
import type { Instance } from "@webstudio-is/sdk";
import { getEditableTextTarget } from "./text-content-utils";

const createInstance = (children: Instance["children"]): Instance => ({
  type: "instance",
  id: "reading-time",
  component: "ws:element",
  tag: "span",
  children,
});

test("targets the existing binding among surrounding static text", () => {
  expect(
    getEditableTextTarget(
      createInstance([
        { type: "text", value: " · " },
        { type: "expression", value: 'readTime ?? ""' },
      ])
    )
  ).toEqual({
    childIndex: 1,
    child: { type: "expression", value: 'readTime ?? ""' },
  });
});

test("does not collapse content with nested instances into a text field", () => {
  expect(
    getEditableTextTarget(
      createInstance([
        { type: "text", value: "prefix" },
        { type: "id", value: "nested" },
      ])
    )
  ).toBeUndefined();
});

test("rejects content with more than one binding", () => {
  expect(
    getEditableTextTarget(
      createInstance([
        { type: "expression", value: "first" },
        { type: "expression", value: "second" },
      ])
    )
  ).toBeUndefined();
});
