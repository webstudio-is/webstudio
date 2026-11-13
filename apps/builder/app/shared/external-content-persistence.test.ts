import { expect, test } from "vitest";
import type { BuilderPatchChange } from "@webstudio-is/project-build/contracts";
import type { BuilderState } from "@webstudio-is/project-build/state";
import { createExternalContentPersistencePlan } from "./external-content-persistence";

const instance = (id: string) => ({
  type: "instance" as const,
  id,
  component: "ws:element",
  tag: "div",
  children: [],
});

const state = (ids: string[]): BuilderState => ({
  instances: new Map(ids.map((id) => [id, instance(id)])),
  props: new Map(),
});

const change = (
  patches: BuilderPatchChange["patches"]
): BuilderPatchChange => ({ namespace: "instances", patches });

test("moves an external instance into project persistence", () => {
  const before = state(["external", "ordinary-parent"]);
  const after = state(["external", "ordinary-parent"]);
  const plan = createExternalContentPersistencePlan({
    beforeData: before,
    afterData: after,
    beforeOwnership: { instances: new Set(["external"]) },
    afterOwnership: { instances: new Set() },
    payload: [
      change([
        {
          op: "add",
          path: ["ordinary-parent", "children", 0],
          value: { type: "id", value: "external" },
        },
      ]),
    ],
  });

  expect(plan.preliminaryExternalPayload).toEqual([
    change([{ op: "remove", path: ["external"] }]),
  ]);
  expect(plan.projectPayload).toEqual([
    change([
      { op: "add", path: ["external"], value: instance("external") },
      {
        op: "add",
        path: ["ordinary-parent", "children", 0],
        value: { type: "id", value: "external" },
      },
    ]),
  ]);
  expect(plan.externalPayload).toEqual([]);
});

test("removes an ordinary instance from project persistence when it enters an external root", () => {
  const before = state(["ordinary"]);
  const after = state(["ordinary"]);
  const plan = createExternalContentPersistencePlan({
    beforeData: before,
    afterData: after,
    beforeOwnership: { instances: new Set() },
    afterOwnership: { instances: new Set(["ordinary"]) },
    payload: [],
  });

  expect(plan.projectPayload).toEqual([
    change([{ op: "remove", path: ["ordinary"] }]),
  ]);
  expect(plan.externalPayload).toEqual([
    change([{ op: "add", path: ["ordinary"], value: instance("ordinary") }]),
  ]);
});

test("keeps connected Content Block children in memory-only persistence", () => {
  const before = state(["block"]);
  const after = state(["block", "paragraph"]);
  const childrenPatch = {
    op: "replace" as const,
    path: ["block", "children"],
    value: [{ type: "id", value: "paragraph" }],
  };
  const plan = createExternalContentPersistencePlan({
    beforeData: before,
    afterData: after,
    beforeOwnership: { instances: new Set() },
    afterOwnership: { instances: new Set(["paragraph"]) },
    externalBlockInstanceIds: new Set(["block"]),
    payload: [
      change([
        childrenPatch,
        { op: "add", path: ["paragraph"], value: instance("paragraph") },
      ]),
    ],
  });

  expect(plan.projectPayload).toEqual([]);
  expect(plan.externalPayload).toEqual([
    change([
      childrenPatch,
      { op: "add", path: ["paragraph"], value: instance("paragraph") },
    ]),
  ]);
});
