import { expect, test } from "vitest";
import {
  blockBodyComponent,
  blockComponent,
  blockTemplateComponent,
  encodeDataSourceVariable,
  type Instance,
  type Prop,
} from "@webstudio-is/sdk";
import { applyContentModeTransaction } from "@webstudio-is/project-build/runtime";
import { createContentModeCapabilities } from "./patch-auth.server";

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
