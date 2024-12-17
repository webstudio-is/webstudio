import { expect, test } from "vitest";
import { $, renderJsx } from "@webstudio-is/template";
import {
  findTreeInstanceIds,
  findTreeInstanceIdsExcludingSlotDescendants,
  parseComponentName,
} from "./instances-utils";

test("find all tree instances", () => {
  const { instances } = renderJsx(
    <$.Body ws:id="1">
      <$.Box ws:id="2"></$.Box>
      <$.Box ws:id="3">
        <$.Box ws:id="4"></$.Box>
        <$.Box ws:id="5"></$.Box>
      </$.Box>
    </$.Body>
  );
  expect(findTreeInstanceIds(instances, "3")).toEqual(new Set(["3", "4", "5"]));
});

test("find all tree instances excluding slot descendants", () => {
  const { instances } = renderJsx(
    <$.Body ws:id="body">
      <$.Box ws:id="box1">
        <$.Slot ws:id="slot">
          <$.Box ws:id="slotbox1"></$.Box>
          <$.Box ws:id="slotbox2"></$.Box>
        </$.Slot>
        <$.Box ws:id="box2"></$.Box>
      </$.Box>
      <$.Box ws:id="box3"></$.Box>
    </$.Body>
  );
  expect(
    findTreeInstanceIdsExcludingSlotDescendants(instances, "box1")
  ).toEqual(new Set(["box1", "slot", "box2"]));
});

test("include not existing/virtual instance", () => {
  const { instances } = renderJsx(<$.Body ws:id="1"></$.Body>);
  expect(findTreeInstanceIds(instances, ":root")).toEqual(new Set([":root"]));
  expect(
    findTreeInstanceIdsExcludingSlotDescendants(instances, ":root")
  ).toEqual(new Set([":root"]));
});

test("extract short name and namespace from component name", () => {
  expect(parseComponentName("Box")).toEqual([undefined, "Box"]);
  expect(parseComponentName("radix:Box")).toEqual(["radix", "Box"]);
});
