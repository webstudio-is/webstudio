import { expect, test } from "vitest";
import type { DataSources } from "./schema/data-sources";
import type { Instance, Instances } from "./schema/instances";
import type { Props } from "./schema/props";
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
const props: Props = new Map([
  [
    "result-action",
    {
      id: "result-action",
      instanceId: form.id,
      name: "onResultChange",
      type: "action",
      value: [
        {
          type: "execute",
          args: ["result"],
          code: `${encodeDataVariableId("errors")} = result.errors`,
        },
      ],
    },
  ],
]);

test.each([
  [{ message: "Add at least one action" }],
  [{ message: "First failure" }, { message: "Second failure" }],
])(
  "saved managed Form error slot renders actual messages without persisting changes",
  (...errors) => {
    const resolved = resolveManagedFormErrorSlot(
      slot,
      instances,
      sources,
      props
    );
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
        sources,
        props
      )
    ).toBe(slot);
  }
  expect(resolveManagedFormErrorSlot(slot, instances, new Map(), props)).toBe(
    slot
  );
  for (const changed of [
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
    expect(
      resolveManagedFormErrorSlot(changed, instances, sources, props)
    ).toBe(changed);
  }
  expect(
    resolveManagedFormErrorSlot(
      { ...slot, label: "Renamed" },
      instances,
      sources,
      props
    ).children[0].type
  ).toBe("expression");
  const renamedSources = new Map(sources);
  renamedSources.set("errors", {
    ...sources.get("errors")!,
    name: "renamedErrors",
  });
  expect(
    resolveManagedFormErrorSlot(slot, instances, renamedSources, props)
      .children[0].type
  ).toBe("expression");
  expect(resolveManagedFormErrorSlot(slot, instances, sources, new Map())).toBe(
    slot
  );
});

test("managed error slot requires a real assignment and accepts computed errors access", () => {
  const action = props.get("result-action")!;
  if (action.type !== "action") {
    throw Error("Expected an action prop");
  }
  const withCode = (code: string): Props =>
    new Map([
      [action.id, { ...action, value: [{ ...action.value[0], code }] }],
    ]);
  const target = encodeDataVariableId("errors");
  expect(
    resolveManagedFormErrorSlot(
      slot,
      instances,
      sources,
      withCode(
        `const text = "${target} = result.errors"; // ${target} = result.errors`
      )
    )
  ).toBe(slot);
  expect(
    resolveManagedFormErrorSlot(
      slot,
      instances,
      sources,
      withCode(`${target} = result["errors"]`)
    ).children[0].type
  ).toBe("expression");
});
