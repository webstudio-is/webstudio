import { expect, test } from "vitest";
import type { Instance } from "@webstudio-is/sdk";
import {
  getAccessibleContentState,
  hasAccessibleName,
  isDynamicPropType,
} from "./accessibility-analysis";

const instances = new Map<string, Instance>([
  [
    "button",
    {
      type: "instance",
      id: "button",
      component: "Button",
      children: [{ type: "id", value: "label" }],
    },
  ],
  [
    "label",
    {
      type: "instance",
      id: "label",
      component: "Text",
      children: [{ type: "expression", value: "label" }],
    },
  ],
  [
    "image-link",
    {
      type: "instance",
      id: "image-link",
      component: "Link",
      children: [{ type: "id", value: "image" }],
    },
  ],
  [
    "image",
    {
      type: "instance",
      id: "image",
      component: "Image",
      children: [],
    },
  ],
]);

test("classifies every runtime-backed prop type as dynamic", () => {
  expect(["expression", "parameter", "resource"].every(isDynamicPropType)).toBe(
    true
  );
  expect(isDynamicPropType("string")).toBe(false);
});

test("distinguishes dynamic accessible content from static text", () => {
  expect(getAccessibleContentState("button", instances)).toEqual({
    hasStatic: false,
    hasDynamic: true,
  });
});

test("accepts dynamic accessible props without requiring a static value", () => {
  expect(
    hasAccessibleName({
      instanceId: "button",
      instances,
      propsByInstance: new Map([
        ["button", new Map([["aria-label", undefined]])],
      ]),
      propTypesByInstance: new Map([
        ["button", new Map([["aria-label", "resource"]])],
      ]),
    })
  ).toBe(true);
});

test("uses a nested image alt as the parent link accessible name", () => {
  expect(
    hasAccessibleName({
      instanceId: "image-link",
      instances,
      propsByInstance: new Map([["image", new Map([["alt", "Portrait"]])]]),
    })
  ).toBe(true);
});
