import { expect, test } from "vitest";
import { elementComponent } from "../core-metas";
import {
  instance,
  instanceCreateInput,
  instanceFilterInput,
  textChild,
} from "./instances";

const validInstance = {
  type: "instance",
  id: "instance-id",
  component: elementComponent,
  children: [],
} as const;

test("allows omitted tags and rejects empty tags", () => {
  expect(instance.safeParse(validInstance).success).toBe(true);
  expect(
    instance.safeParse({
      ...validInstance,
      tag: "",
    }).success
  ).toBe(false);
  expect(
    instance.safeParse({
      ...validInstance,
      tag: "section",
    }).success
  ).toBe(true);
});

test("rejects empty components", () => {
  expect(
    instance.safeParse({
      ...validInstance,
      component: "",
    }).success
  ).toBe(false);
});

test("shares instance field validation with create and filter inputs", () => {
  expect(instanceCreateInput.safeParse({}).success).toBe(true);
  expect(instanceCreateInput.safeParse({ component: "Box" }).success).toBe(
    true
  );
  expect(instanceCreateInput.safeParse({ component: "" }).success).toBe(false);
  expect(instanceCreateInput.safeParse({ tag: "" }).success).toBe(false);
  expect(instanceCreateInput.safeParse({ tag: "section" }).success).toBe(true);

  expect(instanceFilterInput.safeParse({ component: "" }).success).toBe(false);
  expect(instanceFilterInput.safeParse({ tag: "" }).success).toBe(false);
});

test("shares text child value validation", () => {
  expect(textChild.safeParse({ type: "text", value: "" }).success).toBe(true);
});
