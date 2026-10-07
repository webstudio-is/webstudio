import { expect, test } from "vitest";
import type { DataSources } from "./schema/data-sources";
import type { Instance, Instances } from "./schema/instances";
import { encodeDataVariableId } from "./expression";
import {
  resolveManagedFormErrorSlot,
  formatManagedFormErrors,
} from "./managed-form-error-slot";

const slot: Instance = {
  type: "instance",
  id: "feedback",
  component: "ws:element",
  tag: "div",
  label: "Error Message",
  children: [
    { type: "text", value: "Sorry, something went wrong.", placeholder: true },
  ],
};
const form: Instance = {
  type: "instance",
  id: "form",
  component: "NativeForm",
  children: [{ type: "id", value: slot.id }],
};
const instances: Instances = new Map([
  [form.id, form],
  [slot.id, slot],
]);
const sources: DataSources = new Map([
  [
    "errors",
    {
      id: "errors",
      name: "errors",
      type: "variable",
      scopeInstanceId: form.id,
      value: { type: "json", value: [] },
    },
  ],
]);

test.each([
  [{ message: "Add at least one action" }],
  [{ message: "First failure" }, { message: "Second failure" }],
])(
  "saved managed Form error slot renders actual messages without persisting changes",
  (...errors) => {
    const resolved = resolveManagedFormErrorSlot(slot, instances, sources);
    expect(resolved).toMatchObject({
      id: slot.id,
      tag: slot.tag,
      label: slot.label,
    });
    expect(resolved.children[0].type).toBe("expression");
    const expression = resolved.children[0].value;
    const render = new Function(
      encodeDataVariableId("errors"),
      `return (${expression})`
    );
    expect(formatManagedFormErrors(render(errors))).toBe(
      errors.map((error) => error.message).join("\n")
    );
    expect(slot.children[0]).toMatchObject({ type: "text", placeholder: true });
  }
);

test("legacy Forms, customized content, and missing errors are untouched", () => {
  for (const component of ["WebhookForm", "Form"]) {
    expect(
      resolveManagedFormErrorSlot(
        slot,
        new Map([
          [form.id, { ...form, component }],
          [slot.id, slot],
        ]),
        sources
      )
    ).toBe(slot);
  }
  expect(resolveManagedFormErrorSlot(slot, instances, new Map())).toBe(slot);
  for (const changed of [
    { ...slot, label: "Other content" },
    {
      ...slot,
      children: [
        {
          type: "text" as const,
          value: "Authored custom content",
          placeholder: true,
        },
      ],
    },
    {
      ...slot,
      children: [
        { type: "text" as const, value: "Sorry, something went wrong." },
      ],
    },
  ]) {
    expect(resolveManagedFormErrorSlot(changed, instances, sources)).toBe(
      changed
    );
  }
});
