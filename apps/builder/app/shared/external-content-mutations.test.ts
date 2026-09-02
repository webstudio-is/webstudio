import { describe, expect, test } from "vitest";
import type { BuilderPatchChange } from "@webstudio-is/project-build/contracts";
import {
  blockComponent,
  blockTemplateComponent,
  elementComponent,
  type Instance,
  type Prop,
} from "@webstudio-is/sdk";
import {
  getAffectedExternalContentTemplateRootKeys,
  isExternalContentInstance,
  isExternalContentMutation,
} from "./external-content-mutations";

const instance = (
  id: string,
  children: Instance["children"] = []
): Instance => ({
  type: "instance",
  id,
  component: elementComponent,
  tag: "div",
  children,
});

const state = {
  instances: new Map([
    ["block", instance("block", [{ type: "id", value: "external" }])],
    ["external", instance("external")],
    ["ordinary", instance("ordinary")],
  ]),
  props: new Map<string, Prop>([
    [
      "external-prop",
      {
        id: "external-prop",
        instanceId: "external",
        name: "title",
        type: "string",
        value: "Before",
      },
    ],
  ]),
};

const change = (
  namespace: BuilderPatchChange["namespace"],
  patches: BuilderPatchChange["patches"]
): BuilderPatchChange => ({ namespace, patches });

describe("external content mutation detection", () => {
  const roots = new Map([
    [
      "scope",
      {
        blockInstanceId: "block",
        instanceIds: new Set(["external"]),
        ownership: {
          instances: new Set(["external"]),
          props: new Set(["external-prop"]),
          styles: new Set(["external:base:color"]),
        },
        mutationRevision: 0,
      },
    ],
  ]);

  test("detects edits to existing external instances and props", () => {
    expect(
      isExternalContentMutation({
        state,
        roots,
        payload: [
          change("instances", [
            {
              op: "replace",
              path: ["external", "children"],
              value: [{ type: "text", value: "After" }],
            },
          ]),
        ],
      })
    ).toBe(true);
    expect(
      isExternalContentMutation({
        state,
        roots,
        payload: [
          change("props", [
            {
              op: "replace",
              path: ["external-prop", "value"],
              value: "After",
            },
          ]),
        ],
      })
    ).toBe(true);
  });

  test("detects insertion into an empty connected block", () => {
    expect(
      isExternalContentMutation({
        state,
        roots,
        payload: [
          change("instances", [
            {
              op: "replace",
              path: ["block", "children"],
              value: [{ type: "id", value: "inserted" }],
            },
            {
              op: "add",
              path: ["inserted"],
              value: instance("inserted"),
            },
          ]),
        ],
      })
    ).toBe(true);
  });

  test("detects edits to every registered external namespace", () => {
    expect(
      isExternalContentMutation({
        state,
        roots,
        payload: [
          change("styles", [
            {
              op: "replace",
              path: ["external:base:color", "value"],
              value: { type: "keyword", value: "red" },
            },
          ]),
        ],
      })
    ).toBe(true);
  });

  test("does not reroute unrelated project mutations", () => {
    expect(
      isExternalContentMutation({
        state,
        roots,
        payload: [
          change("instances", [
            {
              op: "replace",
              path: ["ordinary", "children"],
              value: [{ type: "text", value: "After" }],
            },
          ]),
        ],
      })
    ).toBe(false);
  });

  test("identifies template changes separately from authored content", () => {
    const templateState = {
      ...state,
      instances: new Map([
        ...state.instances,
        [
          "templates",
          {
            type: "instance" as const,
            id: "templates",
            component: blockTemplateComponent,
            children: [],
          },
        ] as const,
        ["heading-template", instance("heading-template")] as const,
      ]),
    };
    const templateRoots = new Map([
      [
        "scope",
        {
          ...roots.get("scope")!,
          templateOwnership: {
            instances: new Set(["templates", "heading-template"]),
            styleSources: new Set(["heading-template-style"]),
            styles: new Set(["heading-template:base:color"]),
          },
        },
      ],
    ]);
    const payload = [
      change("instances", [
        {
          op: "replace" as const,
          path: ["templates", "children"],
          value: [{ type: "id", value: "heading-template" }],
        },
      ]),
    ];

    expect(
      getAffectedExternalContentTemplateRootKeys({
        state: templateState,
        roots: templateRoots,
        payload,
      })
    ).toEqual(["scope"]);
    expect(
      isExternalContentMutation({ state, roots: templateRoots, payload })
    ).toBe(false);

    expect(
      getAffectedExternalContentTemplateRootKeys({
        state: templateState,
        roots: templateRoots,
        payload: [
          change("instances", [
            {
              op: "replace",
              path: ["block", "children"],
              value: [{ type: "id", value: "inserted" }],
            },
          ]),
        ],
      })
    ).toEqual([]);

    expect(
      getAffectedExternalContentTemplateRootKeys({
        state: templateState,
        roots: templateRoots,
        payload: [
          change("styleSourceSelections", [
            {
              op: "add",
              path: ["heading-template"],
              value: {
                instanceId: "heading-template",
                values: ["heading-template-style"],
              },
            },
          ]),
        ],
      })
    ).toEqual(["scope"]);
    expect(
      getAffectedExternalContentTemplateRootKeys({
        state: templateState,
        roots: templateRoots,
        payload: [
          change("styles", [
            {
              op: "add",
              path: ["heading-template-style:base:background-color"],
              value: {
                breakpointId: "base",
                styleSourceId: "heading-template-style",
                property: "background-color",
                value: { type: "keyword", value: "red" },
              },
            },
          ]),
        ],
      })
    ).toEqual(["scope"]);
  });

  test("detects adding and removing the Templates container", () => {
    const block = {
      type: "instance" as const,
      id: "block",
      component: blockComponent,
      children: [{ type: "id" as const, value: "templates" }],
    };
    const templates = {
      type: "instance" as const,
      id: "templates",
      component: blockTemplateComponent,
      children: [],
    };
    const roots = new Map([
      [
        "scope",
        {
          sourceBlockInstanceId: "block",
          blockInstanceId: "block",
          instanceIds: new Set<string>(),
          templateOwnership: { instances: new Set(["templates"]) },
          mutationRevision: 0,
        },
      ],
    ]);

    expect(
      getAffectedExternalContentTemplateRootKeys({
        state: {
          instances: new Map([
            [block.id, block],
            [templates.id, templates],
          ]),
        },
        roots,
        payload: [
          change("instances", [
            { op: "replace", path: ["block", "children"], value: [] },
          ]),
        ],
      })
    ).toEqual(["scope"]);

    const rootsWithoutTemplates = new Map([
      [
        "scope",
        {
          ...roots.get("scope")!,
          templateOwnership: { instances: new Set<string>() },
        },
      ],
    ]);
    expect(
      getAffectedExternalContentTemplateRootKeys({
        state: { instances: new Map([[block.id, { ...block, children: [] }]]) },
        roots: rootsWithoutTemplates,
        payload: [
          change("instances", [
            { op: "add", path: ["templates"], value: templates },
            {
              op: "replace",
              path: ["block", "children"],
              value: [{ type: "id", value: "templates" }],
            },
          ]),
        ],
      })
    ).toEqual(["scope"]);
  });
});

test("identifies only instances authored by external content", () => {
  const roots = new Map([
    [
      "scope",
      {
        blockInstanceId: "block",
        instanceIds: new Set(["external"]),
        mutationRevision: 0,
      },
    ],
  ]);

  expect(isExternalContentInstance(roots, "external")).toBe(true);
  expect(isExternalContentInstance(roots, "block")).toBe(false);
  expect(isExternalContentInstance(roots, "ordinary")).toBe(false);
});
