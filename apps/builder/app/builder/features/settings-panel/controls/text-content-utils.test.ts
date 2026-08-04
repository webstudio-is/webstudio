import { expect, test } from "vitest";
import type { Instance } from "@webstudio-is/sdk";
import {
  getEditableTextTarget,
  getTextContentUpdateOperation,
} from "./text-content-utils";

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

test("updates the targeted expression without replacing its siblings", () => {
  expect(
    getTextContentUpdateOperation({
      instance: createInstance([
        { type: "text", value: " · " },
        { type: "expression", value: "1 + 1" },
      ]),
      type: "expression",
      value: "2 + 2",
    })
  ).toEqual({
    id: "instances.updateText",
    input: {
      instanceId: "reading-time",
      childIndex: 1,
      mode: "expression",
      text: "2 + 2",
    },
  });
});

test("does not replace unsupported nonempty content", () => {
  expect(
    getTextContentUpdateOperation({
      instance: undefined,
      type: "text",
      value: "replacement",
    })
  ).toBeUndefined();
  expect(
    getTextContentUpdateOperation({
      instance: createInstance([{ type: "id", value: "nested" }]),
      type: "text",
      value: "replacement",
    })
  ).toBeUndefined();
});

test("sets text content on an empty instance", () => {
  expect(
    getTextContentUpdateOperation({
      instance: createInstance([]),
      type: "text",
      value: "content",
    })
  ).toEqual({
    id: "instances.setTextContent",
    input: {
      operation: "set",
      instanceId: "reading-time",
      mode: "text",
      text: "content",
    },
  });
});
