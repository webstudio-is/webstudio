import { expect, test } from "vitest";
import type { Instance, Instances, Props } from "@webstudio-is/sdk";
import {
  getFormDataPreview,
  getBrowserInfoPreview,
} from "./form-context-preview";

test("form context contains empty and configured named controls only from the current form", () => {
  const instances: Instances = new Map<string, Instance>([
    [
      "form",
      {
        id: "form",
        type: "instance",
        component: "NativeForm",
        children: [
          { type: "id", value: "empty" },
          { type: "id", value: "filled" },
          { type: "id", value: "disabled" },
        ],
      },
    ],
    ...["empty", "filled", "disabled", "outside"].map(
      (id) =>
        [
          id,
          {
            id,
            type: "instance" as const,
            component: "Input",
            children: [] as Instance["children"],
          },
        ] as const
    ),
  ]);
  const props: Props = new Map([
    ...["empty", "filled", "disabled", "outside"].map(
      (id) =>
        [
          id,
          {
            id,
            instanceId: id,
            name: "name",
            type: "string" as const,
            value: id,
          },
        ] as const
    ),
    [
      "value",
      {
        id: "value",
        instanceId: "filled",
        name: "defaultValue",
        type: "string",
        value: "current",
      },
    ],
    [
      "disabled-prop",
      {
        id: "disabled-prop",
        instanceId: "disabled",
        name: "disabled",
        type: "boolean",
        value: true,
      },
    ],
  ]);
  expect(getFormDataPreview(instances, props, "form")).toEqual({
    empty: "",
    filled: "current",
  });
});

test("browser preview provides safe browser context without visitor IP or referrer", () => {
  expect(getBrowserInfoPreview()).toEqual({
    ip: "",
    referrer: "",
    userAgent: navigator.userAgent,
    language: navigator.language,
  });
});

test("select preview includes default, selected, text-only, and multiple options", () => {
  const instances: Instances = new Map<string, Instance>([
    [
      "form",
      {
        id: "form",
        type: "instance",
        component: "NativeForm",
        children: ["default", "selected", "text", "multiple"].map((value) => ({
          type: "id",
          value,
        })),
      },
    ],
    ...["default", "selected", "text", "multiple"].map(
      (id): [string, Instance] => [
        id,
        {
          id,
          type: "instance",
          component: "Select",
          children: [
            { type: "id", value: `${id}-first` },
            { type: "id", value: `${id}-second` },
          ],
        },
      ]
    ),
    ...["default", "selected", "text", "multiple"].flatMap(
      (id): [string, Instance][] => [
        [
          `${id}-first`,
          {
            id: `${id}-first`,
            type: "instance",
            component: "Option",
            children: [{ type: "text", value: "First option" }],
          },
        ],
        [
          `${id}-second`,
          {
            id: `${id}-second`,
            type: "instance",
            component: "Option",
            children: [{ type: "text", value: "Second option" }],
          },
        ],
      ]
    ),
  ]);
  const props: Props = new Map();
  for (const id of ["default", "selected", "text", "multiple"]) {
    props.set(id, {
      id,
      instanceId: id,
      name: "name",
      type: "string",
      value: id,
    });
  }
  for (const id of ["default", "selected", "multiple"]) {
    for (const index of ["first", "second"]) {
      props.set(`${id}-${index}`, {
        id: `${id}-${index}`,
        instanceId: `${id}-${index}`,
        name: "value",
        type: "string",
        value: index,
      });
    }
  }
  props.set("selected-option", {
    id: "selected-option",
    instanceId: "selected-second",
    name: "selected",
    type: "boolean",
    value: true,
  });
  props.set("multiple-prop", {
    id: "multiple-prop",
    instanceId: "multiple",
    name: "multiple",
    type: "boolean",
    value: true,
  });
  props.set("multiple-first", {
    id: "multiple-first",
    instanceId: "multiple-first",
    name: "value",
    type: "string",
    value: "first",
  });
  props.set("multiple-first-selected", {
    id: "multiple-first-selected",
    instanceId: "multiple-first",
    name: "selected",
    type: "boolean",
    value: true,
  });
  props.set("multiple-second-selected", {
    id: "multiple-second-selected",
    instanceId: "multiple-second",
    name: "selected",
    type: "boolean",
    value: true,
  });
  expect(getFormDataPreview(instances, props, "form")).toEqual({
    default: "first",
    selected: "second",
    text: "First option",
    multiple: ["first", "second"],
  });
});
