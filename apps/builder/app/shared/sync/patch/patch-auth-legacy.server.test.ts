import { expect, test, vi } from "vitest";
import {
  blockBodyComponent,
  blockComponent,
  blockTemplateComponent,
  encodeDataSourceVariable,
  type Instance,
  type Prop,
} from "@webstudio-is/sdk";
import { applyContentModeTransaction } from "@webstudio-is/project-build/runtime";
const hasProjectPermit = vi.hoisted(() => vi.fn());
vi.mock("@webstudio-is/trpc-interface/index.server", () => {
  class AuthorizationError extends Error {}
  return { AuthorizationError, authorizeProject: { hasProjectPermit } };
});
import {
  authorizePatchEntries,
  createContentModeCapabilities,
} from "./patch-auth.server";

test.each([undefined, "read", "readwrite"] as const)(
  "normalizes legacy CodeText and blocks direct expression patches with mode %s",
  (mode) => {
    const expression = {
      type: "expression" as const,
      value: '"protected"',
      ...(mode === undefined ? {} : { mode }),
    };
    const code: Instance = {
      id: "code",
      type: "instance",
      component: "CodeText",
      children: [],
    };
    const build = {
      pages: "{}",
      instances: JSON.stringify([
        {
          id: "block",
          type: "instance",
          component: blockComponent,
          children: [{ type: "id", value: "body" }],
        },
        {
          id: "body",
          type: "instance",
          component: blockBodyComponent,
          children: [{ type: "id", value: "code" }],
        },
        code,
      ]),
      props: JSON.stringify([
        { id: "legacy-code", instanceId: "code", name: "code", ...expression },
      ]),
      styleSources: "[]",
      styleSourceSelections: "[]",
      styles: "[]",
      breakpoints: "[]",
    };
    const capabilities = createContentModeCapabilities(build);
    expect(capabilities.instances.get("code")?.children).toEqual([expression]);
    expect(capabilities.props.has("legacy-code")).toBe(false);
    const text = [{ type: "text", value: "overwrite" }];
    for (const patch of [
      { op: "replace" as const, path: ["code", "children"], value: text },
      {
        op: "replace" as const,
        path: ["code", "children", 0, "value"],
        value: '"overwrite"',
      },
      {
        op: "replace" as const,
        path: ["code"],
        value: { ...code, children: text },
      },
    ]) {
      expect(
        applyContentModeTransaction({
          capabilities,
          transaction: {
            payload: [{ namespace: "instances", patches: [patch] }],
          },
        }).success
      ).toBe(false);
    }
    // Readwrite on a computed constant is invalid under the existing policy.
    // Valid unchanged bindings, and deleting the whole component, stay allowed.
    expect(
      applyContentModeTransaction({
        capabilities,
        transaction: {
          payload: [
            {
              namespace: "instances",
              patches: [
                {
                  op: "replace",
                  path: ["code"],
                  value: { ...code, children: [expression] },
                },
              ],
            },
          ],
        },
      }).success
    ).toBe(mode !== "readwrite");
    expect(
      applyContentModeTransaction({
        capabilities,
        transaction: {
          payload: [
            {
              namespace: "instances",
              patches: [
                { op: "replace", path: ["body", "children"], value: [] },
                { op: "remove", path: ["code"] },
              ],
            },
          ],
        },
      }).success
    ).toBe(true);
  }
);

test("protects canonical CodeText expressions while allowing literal edits", () => {
  for (const type of ["expression", "text"] as const) {
    const capabilities = createContentModeCapabilities({
      pages: "{}",
      instances: JSON.stringify([
        {
          id: "block",
          type: "instance",
          component: blockComponent,
          children: [{ type: "id", value: "body" }],
        },
        {
          id: "body",
          type: "instance",
          component: blockBodyComponent,
          children: [{ type: "id", value: "code" }],
        },
        {
          id: "code",
          type: "instance",
          component: "CodeText",
          children: [{ type, value: '"before"' }],
        },
      ]),
      props: "[]",
      styleSources: "[]",
      styleSourceSelections: "[]",
      styles: "[]",
      breakpoints: "[]",
    });
    expect(
      applyContentModeTransaction({
        capabilities,
        transaction: {
          payload: [
            {
              namespace: "instances",
              patches: [
                {
                  op: "replace",
                  path: ["code", "children"],
                  value: [{ type: "text", value: "after" }],
                },
              ],
            },
          ],
        },
      }).success
    ).toBe(type === "text");
    if (type === "text") {
      expect(
        applyContentModeTransaction({
          capabilities,
          transaction: {
            payload: [
              {
                namespace: "instances",
                patches: [
                  {
                    op: "replace",
                    path: ["code", "children"],
                    value: [{ type: "expression", value: '"injected"' }],
                  },
                ],
              },
            ],
          },
        }).success
      ).toBe(false);
    }
  }
});

test("normalizes saved legacy bindings without allowing Editor expression replacements", () => {
  const expression = `${encodeDataSourceVariable("document")}.frontmatter.title`;
  const instances: Instance[] = [
    {
      id: "block",
      type: "instance",
      component: blockComponent,
      children: [
        "legacy-title",
        "read-title",
        "computed-title",
        "templates",
        "content",
      ].map((value) => ({ type: "id", value })),
    },
    {
      id: "legacy-title",
      type: "instance",
      component: "Heading",
      children: [{ type: "expression", value: expression }],
    },
    {
      id: "read-title",
      type: "instance",
      component: "Heading",
      children: [{ type: "expression", value: expression, mode: "read" }],
    },
    {
      id: "computed-title",
      type: "instance",
      component: "Heading",
      children: [{ type: "expression", value: `${expression} + "!"` }],
    },
    {
      id: "templates",
      type: "instance",
      component: blockTemplateComponent,
      children: [{ type: "id", value: "template-title" }],
    },
    {
      id: "template-title",
      type: "instance",
      component: "Heading",
      children: [{ type: "expression", value: expression }],
    },
    {
      id: "content",
      type: "instance",
      component: blockBodyComponent,
      children: [{ type: "id", value: "paragraph" }],
    },
    {
      id: "paragraph",
      type: "instance",
      component: "Paragraph",
      children: [{ type: "text", value: "Before" }],
    },
  ];
  const props: Prop[] = [
    {
      id: "source",
      instanceId: "block",
      name: "src",
      type: "asset",
      value: "article",
    },
    {
      id: "document-prop",
      instanceId: "block",
      name: "document",
      type: "parameter",
      value: "document",
    },
    {
      id: "legacy-label",
      instanceId: "legacy-title",
      name: "aria-label",
      type: "expression",
      value: expression,
    },
    {
      id: "read-label",
      instanceId: "read-title",
      name: "aria-label",
      type: "expression",
      value: expression,
      mode: "read",
    },
  ];
  const build = {
    pages: "{}",
    instances: JSON.stringify(instances),
    props: JSON.stringify(props),
    styleSources: "[]",
    styleSourceSelections: "[]",
    styles: "[]",
    breakpoints: "[]",
  };
  const before = structuredClone(build);
  const capabilities = createContentModeCapabilities(build);
  expect(capabilities.frontmatterBoundTextInstanceIds).toEqual(
    new Set(["legacy-title"])
  );
  expect(capabilities.frontmatterBoundPropIds).toEqual(
    new Set(["legacy-label"])
  );
  expect(capabilities.editableInstanceIds.has("legacy-title")).toBe(false);
  expect(capabilities.instances.get("read-title")?.children).toEqual(
    instances[2].children
  );
  expect(capabilities.instances.get("computed-title")?.children).toEqual(
    instances[3].children
  );
  expect(capabilities.instances.get("template-title")?.children).toEqual(
    instances[5].children
  );
  expect(capabilities.props.get("read-label")).toEqual(props[3]);

  for (const id of [
    "legacy-title",
    "read-title",
    "computed-title",
    "template-title",
  ]) {
    expect(
      applyContentModeTransaction({
        capabilities,
        transaction: {
          payload: [
            {
              namespace: "instances",
              patches: [
                {
                  op: "replace",
                  path: [id, "children"],
                  value: [{ type: "text", value: "Bypassed expression" }],
                },
              ],
            },
          ],
        },
      }).success
    ).toBe(false);
  }
  expect(
    applyContentModeTransaction({
      capabilities,
      transaction: {
        payload: [
          {
            namespace: "props",
            patches: [
              {
                op: "replace",
                path: ["legacy-label"],
                value: {
                  ...props[2],
                  type: "string",
                  value: "Bypassed expression",
                },
              },
            ],
          },
        ],
      },
    }).success
  ).toBe(false);
  const contentEdit = applyContentModeTransaction({
    capabilities,
    transaction: {
      payload: [
        {
          namespace: "instances",
          patches: [
            {
              op: "replace",
              path: ["paragraph", "children"],
              value: [{ type: "text", value: "Edited content" }],
            },
          ],
        },
      ],
    },
  });
  expect(contentEdit.success).toBe(true);
  expect(build).toEqual(before);
});

const createLiteralCodeBuild = (component: string) => ({
  pages: "{}",
  instances: JSON.stringify([
    {
      id: "block",
      type: "instance",
      component,
      children: [{ type: "id", value: "body" }],
    },
    {
      id: "body",
      type: "instance",
      component: blockBodyComponent,
      children: [{ type: "id", value: "code" }],
    },
    {
      id: "code",
      type: "instance",
      component: "CodeText",
      children: [{ type: "text", value: "before" }],
    },
  ]),
  props: "[]",
  styleSources: "[]",
  styleSourceSelections: "[]",
  styles: "[]",
  breakpoints: "[]",
});

test("rejects an Editor overwrite after a Builder adds a CodeText binding in the same batch", async () => {
  hasProjectPermit.mockImplementation(async (_request, context) =>
    _request.permit === "build"
      ? context.authorization.role === "builder"
      : true
  );
  const build = createLiteralCodeBuild(blockComponent);
  const transaction = (id: string, child: Instance["children"][number]) => ({
    id,
    payload: [
      {
        namespace: "instances",
        patches: [
          {
            op: "replace",
            path: ["code", "children"],
            value: [child],
          },
        ],
      },
    ],
  });
  const patch = {
    projectId: "project",
    buildId: "build",
    clientVersion: 1,
    entries: [
      {
        transaction: transaction("builder", {
          type: "expression",
          value: '"protected"',
        }),
        writer: {
          type: "context",
          context: { authorization: { role: "builder" } },
        },
      },
      {
        transaction: transaction("editor", {
          type: "text",
          value: "overwritten",
        }),
        writer: {
          type: "context",
          context: { authorization: { role: "editor" } },
        },
      },
    ],
  };
  const result = await authorizePatchEntries({} as never, patch as never, () =>
    createContentModeCapabilities(build)
  );
  expect(result.authorized.map(({ entry }) => entry.transaction.id)).toEqual([
    "builder",
  ]);
  expect(result.rejected.map(({ entry }) => entry.transaction.id)).toEqual([
    "editor",
  ]);
});

test("protects a legacy CodeText prop added by a Builder in the same batch", async () => {
  hasProjectPermit.mockImplementation(async (_request, context) =>
    _request.permit === "build"
      ? context.authorization.role === "builder"
      : true
  );
  const patch = {
    projectId: "project",
    buildId: "build",
    clientVersion: 1,
    entries: [
      {
        transaction: {
          id: "builder",
          payload: [
            {
              namespace: "props",
              patches: [
                {
                  op: "add",
                  path: ["legacy-code"],
                  value: {
                    id: "legacy-code",
                    instanceId: "code",
                    name: "code",
                    type: "expression",
                    value: '"protected"',
                    mode: "read",
                  },
                },
              ],
            },
          ],
        },
        writer: {
          type: "context",
          context: { authorization: { role: "builder" } },
        },
      },
      {
        transaction: {
          id: "editor",
          payload: [
            {
              namespace: "instances",
              patches: [
                {
                  op: "replace",
                  path: ["code", "children"],
                  value: [{ type: "text", value: "overwritten" }],
                },
              ],
            },
          ],
        },
        writer: {
          type: "context",
          context: { authorization: { role: "editor" } },
        },
      },
    ],
  };
  const result = await authorizePatchEntries({} as never, patch as never, () =>
    createContentModeCapabilities(createLiteralCodeBuild(blockComponent))
  );
  expect(result.authorized.map(({ entry }) => entry.transaction.id)).toEqual([
    "builder",
  ]);
  expect(result.rejected.map(({ entry }) => entry.transaction.id)).toEqual([
    "editor",
  ]);
});

test.each([
  [blockComponent, "Box", false],
  ["Box", blockComponent, true],
] as const)(
  "rechecks Editor access when a Builder changes a Content block from %s to %s",
  async (before, after, allowed) => {
    hasProjectPermit.mockImplementation(async (_request, context) =>
      _request.permit === "build"
        ? context.authorization.role === "builder"
        : true
    );
    const patch = {
      projectId: "project",
      buildId: "build",
      clientVersion: 1,
      entries: [
        {
          transaction: {
            id: "builder",
            payload: [
              {
                namespace: "instances",
                patches: [
                  {
                    op: "replace",
                    path: ["block", "component"],
                    value: after,
                  },
                ],
              },
            ],
          },
          writer: {
            type: "context",
            context: { authorization: { role: "builder" } },
          },
        },
        {
          transaction: {
            id: "editor",
            payload: [
              {
                namespace: "instances",
                patches: [
                  {
                    op: "replace",
                    path: ["code", "children"],
                    value: [{ type: "text", value: "edited" }],
                  },
                ],
              },
            ],
          },
          writer: {
            type: "context",
            context: { authorization: { role: "editor" } },
          },
        },
      ],
    };
    const result = await authorizePatchEntries(
      {} as never,
      patch as never,
      () => createContentModeCapabilities(createLiteralCodeBuild(before))
    );
    expect(result.authorized.map(({ entry }) => entry.transaction.id)).toEqual(
      allowed ? ["builder", "editor"] : ["builder"]
    );
    expect(result.rejected.map(({ entry }) => entry.transaction.id)).toEqual(
      allowed ? [] : ["editor"]
    );
  }
);
