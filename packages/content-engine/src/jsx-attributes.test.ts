import { expect, test } from "vitest";
import { mapAttributeNames } from "./jsx-attributes";

test("maps complete prop lists in both directions", () => {
  expect(
    mapAttributeNames({
      attributes: [{ name: "class" }, { name: "tabindex" }],
      direction: "instance-to-jsx",
      acceptsHtmlAttributes: true,
    })
  ).toEqual([{ name: "className" }, { name: "tabIndex" }]);
  expect(
    mapAttributeNames({
      attributes: [{ name: "className" }, { name: "tabIndex" }],
      direction: "jsx-to-instance",
      acceptsHtmlAttributes: true,
    })
  ).toEqual([{ name: "class" }, { name: "tabindex" }]);
});

test("always maps the JSX class alias", () => {
  expect(
    mapAttributeNames({
      attributes: [{ name: "class" }],
      direction: "instance-to-jsx",
      acceptsHtmlAttributes: false,
    })
  ).toEqual([{ name: "className" }]);
  expect(
    mapAttributeNames({
      attributes: [{ name: "className" }],
      direction: "jsx-to-instance",
      acceptsHtmlAttributes: false,
    })
  ).toEqual([{ name: "class" }]);
  expect(
    mapAttributeNames({
      attributes: [{ name: "className" }],
      direction: "jsx-to-instance",
      acceptsHtmlAttributes: false,
      componentPropNames: new Set(["className"]),
    })
  ).toEqual([{ name: "class" }]);
  expect(
    mapAttributeNames({
      attributes: [{ name: "class" }],
      direction: "instance-to-jsx",
      acceptsHtmlAttributes: false,
      componentPropNames: new Set(["class"]),
    })
  ).toEqual([{ name: "className" }]);
});

test("rejects names that collide after conversion", () => {
  expect(() =>
    mapAttributeNames({
      attributes: [{ name: "class" }, { name: "className" }],
      direction: "instance-to-jsx",
      acceptsHtmlAttributes: true,
    })
  ).toThrow('Multiple properties map to "className"');
});
