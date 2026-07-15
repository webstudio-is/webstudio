import { describe, expect, test } from "vitest";
import {
  blockComponent,
  blockTemplateComponent,
  getStyleDeclKey,
} from "@webstudio-is/sdk";
import type {
  Instance,
  Prop,
  StyleDecl,
  WsComponentMeta,
} from "@webstudio-is/sdk";
import {
  contentModePermissionsTesting,
  applyContentModeTransaction,
  getContentModeCapabilities,
  getContentModeEditableInstanceIds,
  getContentModePropNamesByTag,
  isContentModeCopyableProp,
  isContentModePagePath,
  validateContentModeTransaction,
  type ContentModePatchTransaction,
} from "./content-mode-permissions";

const {
  hasOnlyAddedInstancesInSubtree,
  hasOnlyContentModePageMeta,
  isContentModePageMetaValue,
  isContentModePropPatchValue,
  validateEditableInstanceReferences,
} = contentModePermissionsTesting;

const metas = new Map<string, WsComponentMeta>([
  [
    "Link",
    {
      props: {
        href: {
          type: "string",
          control: "url",
          required: false,
          contentMode: true,
        },
        target: {
          type: "string",
          control: "text",
          required: false,
        },
      },
    },
  ],
]);

const instances = new Map<string, Instance>([
  [
    "block",
    {
      type: "instance",
      id: "block",
      component: blockComponent,
      children: [{ type: "id", value: "link" }],
    },
  ],
  [
    "link",
    {
      type: "instance",
      id: "link",
      component: "Link",
      children: [],
    },
  ],
]);

const props = new Map<string, Prop>([
  [
    "href-prop",
    {
      id: "href-prop",
      instanceId: "link",
      name: "href",
      type: "string",
      value: "/",
    },
  ],
  [
    "target-prop",
    {
      id: "target-prop",
      instanceId: "link",
      name: "target",
      type: "string",
      value: "_self",
    },
  ],
]);
const styleSources = new Map([
  ["token", { type: "token" as const, id: "token", name: "Token" }],
  ["local", { type: "local" as const, id: "local" }],
]);

const transaction = (
  namespace: string,
  patches: ContentModePatchTransaction["payload"][number]["patches"]
): ContentModePatchTransaction => ({
  id: "tx-1",
  payload: [{ namespace, patches }],
});

describe("content mode permissions", () => {
  test("allows only static page paths in content mode", () => {
    expect(isContentModePagePath("/about")).toBe(true);
    expect(isContentModePagePath("")).toBe(true);
    expect(isContentModePagePath("/")).toBe(false);
    expect(isContentModePagePath("about")).toBe(false);
    expect(isContentModePagePath("/about/")).toBe(false);
    expect(isContentModePagePath("/about//team")).toBe(false);
    expect(isContentModePagePath("/s")).toBe(false);
    expect(isContentModePagePath("/build/main.js")).toBe(false);
    expect(isContentModePagePath("/posts/:slug")).toBe(false);
    expect(isContentModePagePath("/docs/*")).toBe(false);
    expect(isContentModePagePath("https://example.com")).toBe(false);
    expect(isContentModePagePath(1)).toBe(false);
  });

  test("derives content-mode prop names by tag", () => {
    expect(
      getContentModePropNamesByTag(
        new Map([
          [
            "Link",
            {
              ...metas.get("Link"),
              presetStyle: { a: [] },
            },
          ],
        ])
      )
    ).toEqual(new Map([["a", new Set(["href"])]]));
    expect(getContentModePropNamesByTag(metas)).toEqual(new Map());
    expect(
      getContentModePropNamesByTag(
        new Map([
          [
            "Link",
            {
              ...metas.get("Link"),
              presetStyle: { a: [] },
            },
          ],
        ])
      )
        .get("a")
        ?.has("target")
    ).toBe(false);
  });

  test("merges content prop names for the same tag", () => {
    expect(
      getContentModePropNamesByTag(
        new Map([
          [
            "Link",
            {
              ...metas.get("Link"),
              presetStyle: { a: [] },
            },
          ],
          [
            "Image",
            {
              presetStyle: { a: [] },
              props: {
                alt: {
                  type: "string",
                  control: "text",
                  required: false,
                  contentMode: true,
                },
              },
            },
          ],
        ])
      )
    ).toEqual(new Map([["a", new Set(["href", "alt"])]]));
  });

  test("derives editable instance ids from default content roots", () => {
    expect(getContentModeEditableInstanceIds({ instances })).toEqual(
      new Set(["block", "link"])
    );
  });

  test("derives editable instance ids from explicit content roots", () => {
    expect(
      getContentModeEditableInstanceIds({
        contentRootIds: new Set(["link"]),
        instances,
      })
    ).toEqual(new Set(["link"]));
  });

  test("skips block templates when deriving editable instance ids", () => {
    expect(
      getContentModeEditableInstanceIds({
        contentRootIds: new Set(["template"]),
        instances: new Map([
          [
            "template",
            {
              type: "instance",
              id: "template",
              component: blockTemplateComponent,
              children: [{ type: "id", value: "link" }],
            },
          ],
          [
            "link",
            {
              type: "instance",
              id: "link",
              component: "Link",
              children: [],
            },
          ],
        ]),
      })
    ).toEqual(new Set());
  });

  test("does not infer block templates as default content roots", () => {
    expect(
      getContentModeEditableInstanceIds({
        instances: new Map([
          [
            "template",
            {
              type: "instance",
              id: "template",
              component: blockTemplateComponent,
              children: [{ type: "id", value: "link" }],
            },
          ],
          [
            "link",
            {
              type: "instance",
              id: "link",
              component: "Link",
              children: [],
            },
          ],
        ]),
      })
    ).toEqual(new Set());
  });

  test("does not include instances outside content roots", () => {
    expect(
      getContentModeEditableInstanceIds({
        contentRootIds: new Set(["root"]),
        instances: new Map([
          [
            "root",
            {
              type: "instance",
              id: "root",
              component: "Box",
              children: [],
            },
          ],
          [
            "outside",
            {
              type: "instance",
              id: "outside",
              component: "Link",
              children: [],
            },
          ],
        ]),
      })
    ).toEqual(new Set(["root"]));
  });

  test("stops traversal at nested block templates", () => {
    expect(
      getContentModeEditableInstanceIds({
        contentRootIds: new Set(["block"]),
        instances: new Map([
          [
            "block",
            {
              type: "instance",
              id: "block",
              component: blockComponent,
              children: [{ type: "id", value: "template" }],
            },
          ],
          [
            "template",
            {
              type: "instance",
              id: "template",
              component: blockTemplateComponent,
              children: [{ type: "id", value: "link" }],
            },
          ],
          [
            "link",
            {
              type: "instance",
              id: "link",
              component: "Link",
              children: [],
            },
          ],
        ]),
      })
    ).toEqual(new Set(["block"]));
  });

  test("ignores missing child references while deriving editable instances", () => {
    expect(
      getContentModeEditableInstanceIds({
        contentRootIds: new Set(["root"]),
        instances: new Map([
          [
            "root",
            {
              type: "instance",
              id: "root",
              component: "Box",
              children: [{ type: "id", value: "missing" }],
            },
          ],
        ]),
      })
    ).toEqual(new Set(["root"]));
  });

  test("does not loop on recursive instance references", () => {
    expect(
      getContentModeEditableInstanceIds({
        contentRootIds: new Set(["root"]),
        instances: new Map([
          [
            "root",
            {
              type: "instance",
              id: "root",
              component: "Box",
              children: [{ type: "id", value: "root" }],
            },
          ],
        ]),
      })
    ).toEqual(new Set(["root"]));
  });

  test("ignores non-id children while deriving editable instances", () => {
    expect(
      getContentModeEditableInstanceIds({
        contentRootIds: new Set(["root"]),
        instances: new Map([
          [
            "root",
            {
              type: "instance",
              id: "root",
              component: "Box",
              children: [{ type: "text", value: "Text" }],
            },
          ],
        ]),
      })
    ).toEqual(new Set(["root"]));
  });

  test("ignores missing explicit content roots", () => {
    expect(
      getContentModeEditableInstanceIds({
        contentRootIds: new Set(["missing"]),
        instances,
      })
    ).toEqual(new Set());
  });

  test("validates content-mode page meta values", () => {
    expect(isContentModePageMetaValue("title", "Title")).toBe(true);
    expect(isContentModePageMetaValue("title", 1)).toBe(false);
    expect(
      isContentModePageMetaValue("custom", [
        { property: "og:type", content: "website" },
      ])
    ).toBe(true);
    expect(
      isContentModePageMetaValue("custom", [
        { property: "og:type", content: 1 },
      ])
    ).toBe(false);
    expect(isContentModePageMetaValue("auth", "value")).toBe(false);
  });

  test("validates content-mode page meta objects", () => {
    expect(
      hasOnlyContentModePageMeta({
        title: "Title",
        custom: [{ property: "og:type", content: "website" }],
      })
    ).toBe(true);
    expect(hasOnlyContentModePageMeta({ auth: "value" })).toBe(false);
  });

  test("validates content-mode prop patch values", () => {
    const capabilities = getContentModeCapabilities({
      instances,
      metas,
      props,
      styleSources,
    });

    expect(
      isContentModePropPatchValue({
        capabilities,
        editableInstanceIds: new Set(["link"]),
        expectedPropId: "new-href-prop",
        value: {
          id: "new-href-prop",
          instanceId: "link",
          name: "href",
          type: "string",
          value: "/about",
        },
      })
    ).toBe(true);
    expect(
      isContentModePropPatchValue({
        capabilities,
        editableInstanceIds: new Set(["link"]),
        expectedPropId: "new-href-prop",
        value: {
          id: "different-prop",
          instanceId: "link",
          name: "href",
          type: "string",
          value: "/about",
        },
      })
    ).toBe(false);
  });

  test("validates that page-created roots contain only added instances", () => {
    const capabilities = getContentModeCapabilities({
      instances: new Map([
        [
          "existing",
          {
            type: "instance",
            id: "existing",
            component: "Box",
            children: [],
          },
        ],
        [
          "new-root",
          {
            type: "instance",
            id: "new-root",
            component: "Body",
            children: [{ type: "id", value: "new-child" }],
          },
        ],
        [
          "new-child",
          {
            type: "instance",
            id: "new-child",
            component: "Box",
            children: [],
          },
        ],
      ]),
      metas,
      props: new Map(),
      styleSources,
      contentRootIds: new Set(["new-root"]),
    });
    const context = {
      capabilities,
      initialContentRootIds: new Set<string>(),
      initialEditableInstanceIds: new Set<string>(),
      initialEditableInstanceRootIds: new Map<string, string>(),
      initialBlockTemplateChildIdsByInstanceId: new Map(),
      addedInstanceIds: new Set(["new-root", "new-child"]),
      removedEditableInstanceIds: new Set<string>(),
      addedPageIds: new Set<string>(),
      addedLocalStyleSourceIds: new Set<string>(),
      removedLocalStyleSourceIds: new Set<string>(),
      selectedLocalStyleSourceIds: new Set<string>(),
      styledLocalStyleSourceIds: new Set<string>(),
      editableInstanceIds: new Set<string>(),
    };

    expect(hasOnlyAddedInstancesInSubtree(context, "new-root")).toBe(true);
    capabilities.instances.set("new-root", {
      type: "instance",
      id: "new-root",
      component: "Body",
      children: [{ type: "id", value: "existing" }],
    });
    expect(hasOnlyAddedInstancesInSubtree(context, "new-root")).toBe(false);
  });

  test("validates duplicate content instance references", () => {
    const capabilities = getContentModeCapabilities({
      instances: new Map([
        [
          "block",
          {
            type: "instance",
            id: "block",
            component: blockComponent,
            children: [
              { type: "id", value: "item" },
              { type: "id", value: "item" },
            ],
          },
        ],
        [
          "item",
          {
            type: "instance",
            id: "item",
            component: "Box",
            children: [],
          },
        ],
      ]),
      metas,
      props: new Map(),
      styleSources,
    });

    expect(
      validateEditableInstanceReferences({
        capabilities,
        initialContentRootIds: new Set(["block"]),
        initialEditableInstanceIds: new Set(["block", "item"]),
        initialEditableInstanceRootIds: new Map([["item", "block"]]),
        initialBlockTemplateChildIdsByInstanceId: new Map(),
        addedInstanceIds: new Set(),
        removedEditableInstanceIds: new Set(),
        addedPageIds: new Set<string>(),
        addedLocalStyleSourceIds: new Set(),
        removedLocalStyleSourceIds: new Set(),
        selectedLocalStyleSourceIds: new Set(),
        styledLocalStyleSourceIds: new Set(),
        editableInstanceIds: new Set(["block", "item"]),
      })
    ).toEqual({
      success: false,
      error: "Content instances must not be referenced multiple times.",
    });
  });

  test("uses the same capabilities for UI prop checks and transaction validation", () => {
    const capabilities = getContentModeCapabilities({
      instances,
      metas,
      props,
      styleSources,
      breakpoints: new Map([["base", { id: "base", label: "Base" }]]),
    });

    expect(capabilities.editablePropIds.has("href-prop")).toBe(true);
    expect(capabilities.editableInstanceIds).toEqual(
      new Set(["block", "link"])
    );
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("props", [
          { op: "replace", path: ["href-prop", "value"], value: "/about" },
        ]),
      })
    ).toEqual({ success: true });

    expect(capabilities.editablePropIds.has("target-prop")).toBe(false);
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("props", [
          { op: "replace", path: ["target-prop", "value"], value: "_blank" },
        ]),
      })
    ).toEqual({
      success: false,
      error: 'Prop "target-prop" is not editable in content mode.',
    });
  });

  test("scopes content mode props to content roots", () => {
    const capabilities = getContentModeCapabilities({
      instances: new Map([
        [
          "outside-link",
          {
            type: "instance",
            id: "outside-link",
            component: "Link",
            children: [],
          },
        ],
      ]),
      metas,
      props: new Map([
        [
          "outside-href-prop",
          {
            id: "outside-href-prop",
            instanceId: "outside-link",
            name: "href",
            type: "string",
            value: "/",
          },
        ],
      ]),
      styleSources,
    });

    expect(capabilities.editablePropIds.has("outside-href-prop")).toBe(false);
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("props", [
          {
            op: "replace",
            path: ["outside-href-prop", "value"],
            value: "/about",
          },
        ]),
      })
    ).toEqual({
      success: false,
      error: 'Prop "outside-href-prop" is not editable in content mode.',
    });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("props", [
          {
            op: "add",
            path: ["new-outside-href-prop"],
            value: {
              id: "new-outside-href-prop",
              instanceId: "outside-link",
              name: "href",
              type: "string",
              value: "/about",
            },
          },
        ]),
      })
    ).toEqual({
      success: false,
      error: 'Prop "new-outside-href-prop" is not editable in content mode.',
    });

    const templateCapabilities = getContentModeCapabilities({
      instances: new Map([
        [
          "block",
          {
            type: "instance",
            id: "block",
            component: blockComponent,
            children: [{ type: "id", value: "template" }],
          },
        ],
        [
          "template",
          {
            type: "instance",
            id: "template",
            component: blockTemplateComponent,
            children: [{ type: "id", value: "template-link" }],
          },
        ],
        [
          "template-link",
          {
            type: "instance",
            id: "template-link",
            component: "Link",
            children: [],
          },
        ],
      ]),
      metas,
      props: new Map([
        [
          "template-href-prop",
          {
            id: "template-href-prop",
            instanceId: "template-link",
            name: "href",
            type: "string",
            value: "/",
          },
        ],
      ]),
      styleSources,
    });

    expect(templateCapabilities.editablePropIds.has("template-href-prop")).toBe(
      false
    );
  });

  test("supports explicit content roots for template fragment checks", () => {
    const capabilities = getContentModeCapabilities({
      instances,
      metas,
      props,
      styleSources,
      contentRootIds: new Set(["link"]),
    });

    expect(capabilities.editablePropIds.has("href-prop")).toBe(true);
  });

  test("validates new content mode props from patch values", () => {
    const capabilities = getContentModeCapabilities({
      instances,
      metas,
      props: new Map(),
      styleSources,
    });

    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("props", [
          {
            op: "add",
            path: ["href-prop"],
            value: {
              id: "href-prop",
              instanceId: "link",
              name: "href",
              type: "string",
              value: "/about",
            },
          },
        ]),
      })
    ).toEqual({ success: true });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("props", [
          {
            op: "add",
            path: ["new-href-prop"],
            value: {
              id: "new-href-prop",
              instanceId: "link",
              name: "href",
              type: "string",
              value: "/about",
            },
          },
          {
            op: "replace",
            path: ["new-href-prop", "value"],
            value: "/contact",
          },
        ]),
      })
    ).toEqual({ success: true });

    expect(
      validateContentModeTransaction({
        capabilities: getContentModeCapabilities({
          instances,
          metas,
          props: new Map(),
          styleSources,
        }),
        transaction: transaction("props", [
          {
            op: "add",
            path: ["new-href-prop"],
            value: {
              id: "new-href-prop",
              instanceId: "link",
              name: "href",
              type: "number",
              value: 1,
            },
          },
        ]),
      })
    ).toEqual({
      success: false,
      error: 'Prop "new-href-prop" is not editable in content mode.',
    });
  });

  test("returns advanced capabilities after applying a content mode transaction", () => {
    const capabilities = getContentModeCapabilities({
      instances,
      metas,
      props: new Map(),
      styleSources,
    });

    const result = applyContentModeTransaction({
      capabilities,
      transaction: transaction("props", [
        {
          op: "add",
          path: ["href-prop"],
          value: {
            id: "href-prop",
            instanceId: "link",
            name: "href",
            type: "string",
            value: "/about",
          },
        },
      ]),
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.capabilities.editablePropIds.has("href-prop")).toBe(true);
      expect(result.capabilities.props.has("href-prop")).toBe(true);
    }
    expect(capabilities.editablePropIds.has("href-prop")).toBe(false);
    expect(capabilities.props.has("href-prop")).toBe(false);
  });

  test("applies children array patches to instances without children field", () => {
    const capabilities = getContentModeCapabilities({
      instances: new Map([
        [
          "block",
          {
            type: "instance",
            id: "block",
            component: blockComponent,
          } as Instance,
        ],
      ]),
      metas,
      props: new Map(),
      styleSources,
    });

    const result = applyContentModeTransaction({
      capabilities,
      transaction: {
        id: "tx-1",
        payload: [
          {
            namespace: "instances",
            patches: [
              {
                op: "add",
                path: ["new-child"],
                value: {
                  type: "instance",
                  id: "new-child",
                  component: "Box",
                  children: [],
                },
              },
              {
                op: "add",
                path: ["block", "children"],
                value: [{ type: "id", value: "new-child" }],
              },
            ],
          },
        ],
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.capabilities.instances.get("block")?.children).toEqual([
        { type: "id", value: "new-child" },
      ]);
    }
  });

  test("returns updated prop values after applying a content mode transaction", () => {
    const capabilities = getContentModeCapabilities({
      instances,
      metas,
      props,
      styleSources,
    });

    const result = applyContentModeTransaction({
      capabilities,
      transaction: transaction("props", [
        {
          op: "replace",
          path: ["href-prop", "value"],
          value: "/updated",
        },
      ]),
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.capabilities.props.get("href-prop")).toEqual({
        id: "href-prop",
        instanceId: "link",
        name: "href",
        type: "string",
        value: "/updated",
      });
    }
    expect(capabilities.props.get("href-prop")).toEqual({
      id: "href-prop",
      instanceId: "link",
      name: "href",
      type: "string",
      value: "/",
    });
  });

  test("does not mutate shared capabilities while validating transactions", () => {
    const capabilities = getContentModeCapabilities({
      instances,
      metas,
      props,
      styleSources,
    });

    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: {
          id: "tx-1",
          payload: [
            {
              namespace: "props",
              patches: [
                { op: "remove", path: ["href-prop"] },
                {
                  op: "add",
                  path: ["new-href-prop"],
                  value: {
                    id: "new-href-prop",
                    instanceId: "link",
                    name: "href",
                    type: "string",
                    value: "/about",
                  },
                },
              ],
            },
          ],
        },
      })
    ).toEqual({ success: true });

    expect(capabilities.editablePropIds.has("href-prop")).toBe(true);
    expect(capabilities.editablePropIds.has("new-href-prop")).toBe(false);
    expect(capabilities.props.has("href-prop")).toBe(true);
    expect(capabilities.props.has("new-href-prop")).toBe(false);
  });

  test("treats asset props as content props inside content roots", () => {
    const capabilities = getContentModeCapabilities({
      instances,
      metas,
      props: new Map([
        [
          "asset-prop",
          {
            id: "asset-prop",
            instanceId: "link",
            name: "image",
            type: "asset",
            value: "asset-1",
          },
        ],
      ]),
      styleSources,
    });

    expect(capabilities.editablePropIds.has("asset-prop")).toBe(true);
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("props", [
          {
            op: "replace",
            path: ["asset-prop", "value"],
            value: "asset-2",
          },
        ]),
      })
    ).toEqual({ success: true });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("props", [
          {
            op: "add",
            path: ["new-asset-prop"],
            value: {
              id: "new-asset-prop",
              instanceId: "link",
              name: "image",
              type: "asset",
              value: "asset-1",
            },
          },
        ]),
      })
    ).toEqual({ success: true });
  });

  test("identifies editable and copyable content mode props", () => {
    const contentProps = new Map<string, Prop>([
      [
        "asset-prop",
        {
          id: "asset-prop",
          instanceId: "link",
          name: "image",
          type: "asset",
          value: "asset-1",
        },
      ],
      [
        "expression-prop",
        {
          id: "expression-prop",
          instanceId: "link",
          name: "href",
          type: "expression",
          value: "data",
        },
      ],
    ]);
    const capabilities = getContentModeCapabilities({
      instances,
      metas,
      props: contentProps,
      styleSources,
    });

    expect(capabilities.editablePropIds.has("asset-prop")).toBe(true);
    expect(
      isContentModeCopyableProp({
        capabilities,
        prop: contentProps.get("asset-prop")!,
      })
    ).toBe(true);
    expect(capabilities.editablePropIds.has("expression-prop")).toBe(false);
    expect(
      isContentModeCopyableProp({
        capabilities,
        prop: contentProps.get("expression-prop")!,
      })
    ).toBe(false);
  });

  test("supports content mode props derived from ws:element tag", () => {
    const capabilities = getContentModeCapabilities({
      instances: new Map([
        [
          "image-element",
          {
            type: "instance",
            id: "image-element",
            component: "ws:element",
            children: [],
          },
        ],
      ]),
      metas: new Map([
        ["ws:element", {}],
        [
          "Image",
          {
            presetStyle: { img: [] },
            props: {
              alt: {
                type: "string",
                control: "text",
                required: false,
                contentMode: true,
              },
            },
          },
        ],
      ]),
      props: new Map([
        [
          "tag-prop",
          {
            id: "tag-prop",
            instanceId: "image-element",
            name: "tag",
            type: "string",
            value: "img",
          },
        ],
        [
          "alt-prop",
          {
            id: "alt-prop",
            instanceId: "image-element",
            name: "alt",
            type: "string",
            value: "Previous",
          },
        ],
      ]),
      styleSources,
      contentRootIds: new Set(["image-element"]),
    });

    expect(capabilities.editablePropIds.has("alt-prop")).toBe(true);
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("props", [
          { op: "replace", path: ["alt-prop", "value"], value: "Updated" },
        ]),
      })
    ).toEqual({ success: true });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("props", [
          {
            op: "add",
            path: ["new-alt-prop"],
            value: {
              id: "new-alt-prop",
              instanceId: "image-element",
              name: "alt",
              type: "string",
              value: "New",
            },
          },
        ]),
      })
    ).toEqual({ success: true });
  });

  test("validates new props against instances added in the same transaction", () => {
    const capabilities = getContentModeCapabilities({
      instances: new Map([
        ...instances,
        [
          "block",
          {
            type: "instance",
            id: "block",
            component: blockComponent,
            children: [],
          } satisfies Instance,
        ],
      ]),
      metas,
      props: new Map(),
      styleSources,
    });

    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: {
          id: "tx-1",
          payload: [
            {
              namespace: "props",
              patches: [
                {
                  op: "add",
                  path: ["new-href-prop"],
                  value: {
                    id: "new-href-prop",
                    instanceId: "new-link",
                    name: "href",
                    type: "string",
                    value: "/about",
                  },
                },
              ],
            },
            {
              namespace: "instances",
              patches: [
                {
                  op: "add",
                  path: ["new-link"],
                  value: {
                    type: "instance",
                    id: "new-link",
                    component: "Link",
                    children: [],
                  },
                },
                {
                  op: "add",
                  path: ["block", "children", 0],
                  value: { type: "id", value: "new-link" },
                },
              ],
            },
          ],
        },
      })
    ).toEqual({ success: true });

    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: {
          id: "tx-2",
          payload: [
            {
              namespace: "instances",
              patches: [
                {
                  op: "add",
                  path: ["new-root-2"],
                  value: {
                    type: "instance",
                    id: "new-root-2",
                    component: "Body",
                    children: [],
                  },
                },
              ],
            },
            {
              namespace: "pages",
              patches: [
                {
                  op: "add",
                  path: ["folders", "root", "children", 0],
                  value: "new-page-2",
                },
                {
                  op: "add",
                  path: ["pages", "new-page-2"],
                  value: {
                    id: "new-page-2",
                    name: "New page 2",
                    path: "/new-page-2",
                    title: "New page 2",
                    rootInstanceId: "new-root-2",
                    meta: {},
                  },
                },
              ],
            },
          ],
        },
      })
    ).toEqual({ success: true });
  });

  test("allows legacy content mode structural namespaces through capabilities", () => {
    const capabilities = getContentModeCapabilities({
      instances: new Map([
        [
          "block",
          {
            type: "instance",
            id: "block",
            component: blockComponent,
            children: [
              { type: "id", value: "template-container" },
              { type: "id", value: "instance-1" },
            ],
          },
        ],
        [
          "template-container",
          {
            type: "instance",
            id: "template-container",
            component: blockTemplateComponent,
            children: [{ type: "id", value: "template-child" }],
          },
        ],
        [
          "template-child",
          {
            type: "instance",
            id: "template-child",
            component: "Box",
            children: [],
          },
        ],
        [
          "instance-1",
          {
            type: "instance",
            id: "instance-1",
            component: "Box",
            children: [],
          },
        ],
        [
          "outside",
          {
            type: "instance",
            id: "outside",
            component: "Box",
            children: [],
          },
        ],
      ]),
      metas,
      props,
      styleSources,
    });

    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("instances", [
          { op: "replace", path: ["instance-1", "children"], value: [] },
        ]),
      })
    ).toEqual({ success: true });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: {
          id: "tx-1",
          payload: [
            {
              namespace: "instances",
              patches: [
                {
                  op: "add",
                  path: ["new-instance"],
                  value: {
                    type: "instance",
                    id: "new-instance",
                    component: "Box",
                    children: [],
                  },
                },
                {
                  op: "add",
                  path: ["block", "children", 0],
                  value: { type: "id", value: "new-instance" },
                },
              ],
            },
          ],
        },
      })
    ).toEqual({ success: true });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: {
          id: "tx-1",
          payload: [
            {
              namespace: "instances",
              patches: [
                {
                  op: "add",
                  path: ["new-parent"],
                  value: {
                    type: "instance",
                    id: "new-parent",
                    component: "Box",
                    children: [{ type: "id", value: "new-child" }],
                  },
                },
                {
                  op: "add",
                  path: ["new-child"],
                  value: {
                    type: "instance",
                    id: "new-child",
                    component: "Box",
                    children: [],
                  },
                },
                {
                  op: "add",
                  path: ["block", "children", 0],
                  value: { type: "id", value: "new-parent" },
                },
              ],
            },
          ],
        },
      })
    ).toEqual({ success: true });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("instances", [
          {
            op: "add",
            path: ["instance-1", "children", 0],
            value: { type: "text", value: "content" },
          },
        ]),
      })
    ).toEqual({ success: true });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("instances", [
          {
            op: "replace",
            path: ["instance-1", "children", 0],
            value: { type: "text", value: "updated" },
          },
        ]),
      })
    ).toEqual({ success: true });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("instances", [
          { op: "remove", path: ["instance-1", "children", 0] },
        ]),
      })
    ).toEqual({ success: true });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("instances", [
          {
            op: "add",
            path: ["instance-1", "children", "bad-index"],
            value: { type: "text", value: "content" },
          },
        ]),
      })
    ).toEqual({
      success: false,
      error: "Instance patch is not editable in content mode.",
    });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: {
          id: "tx-1",
          payload: [
            {
              namespace: "instances",
              patches: [
                {
                  op: "add",
                  path: ["new-with-outside-child"],
                  value: {
                    type: "instance",
                    id: "new-with-outside-child",
                    component: "Box",
                    children: [{ type: "id", value: "outside" }],
                  },
                },
                {
                  op: "add",
                  path: ["block", "children", 0],
                  value: { type: "id", value: "new-with-outside-child" },
                },
              ],
            },
          ],
        },
      })
    ).toEqual({
      success: false,
      error: "Instance patch is outside content roots.",
    });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("instances", [
          {
            op: "add",
            path: ["block", "children", 0],
            value: { type: "id", value: "outside" },
          },
        ]),
      })
    ).toEqual({
      success: false,
      error: "Instance patch is not editable in content mode.",
    });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("instances", [
          {
            op: "replace",
            path: ["block", "children"],
            value: [{ type: "id", value: "outside" }],
          },
        ]),
      })
    ).toEqual({
      success: false,
      error: "Instance patch is not editable in content mode.",
    });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("instances", [
          {
            op: "add",
            path: ["instance-1", "children", 0],
            value: { type: "unsupported", value: "content" },
          },
        ]),
      })
    ).toEqual({
      success: false,
      error: "Instance patch is not editable in content mode.",
    });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("styleSourceSelections", [
          {
            op: "add",
            path: ["instance-1"],
            value: { instanceId: "instance-1", values: ["token"] },
          },
        ]),
      })
    ).toEqual({
      success: false,
      error:
        "Style source selections are editable only for new content instances.",
    });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("styleSourceSelections", [
          {
            op: "add",
            path: ["instance-1"],
            value: { instanceId: "instance-1", values: ["local"] },
          },
        ]),
      })
    ).toEqual({
      success: false,
      error:
        "Style source selections are editable only for new content instances.",
    });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("styleSourceSelections", [
          {
            op: "add",
            path: ["instance-1"],
            value: { instanceId: "instance-1", values: ["missing"] },
          },
        ]),
      })
    ).toEqual({
      success: false,
      error:
        "Style source selections are editable only for new content instances.",
    });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("instances", [
          { op: "remove", path: ["block", "children", 1] },
          { op: "remove", path: ["instance-1"] },
        ]),
      })
    ).toEqual({ success: true });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("instances", [
          { op: "remove", path: ["instance-1"] },
        ]),
      })
    ).toEqual({
      success: false,
      error: "Removed content instances must not be referenced.",
    });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("instances", [
          { op: "remove", path: ["block"] },
        ]),
      })
    ).toEqual({
      success: false,
      error: "Instance patch is not editable in content mode.",
    });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("instances", [
          { op: "replace", path: ["outside", "children"], value: [] },
        ]),
      })
    ).toEqual({
      success: false,
      error: "Instance patch is outside content roots.",
    });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("instances", [
          { op: "remove", path: ["outside"] },
        ]),
      })
    ).toEqual({
      success: false,
      error: "Instance patch is outside content roots.",
    });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("instances", [
          { op: "replace", path: ["template-child", "children"], value: [] },
        ]),
      })
    ).toEqual({
      success: false,
      error: "Instance patch is outside content roots.",
    });
  });

  test("allows content insertion patches that preserve block template children", () => {
    const capabilities = getContentModeCapabilities({
      instances: new Map([
        [
          "block",
          {
            type: "instance",
            id: "block",
            component: blockComponent,
            children: [
              { type: "id", value: "instance-1" },
              { type: "id", value: "template-container" },
            ],
          },
        ],
        [
          "instance-1",
          {
            type: "instance",
            id: "instance-1",
            component: "Box",
            children: [],
          },
        ],
        [
          "template-container",
          {
            type: "instance",
            id: "template-container",
            component: blockTemplateComponent,
            children: [],
          },
        ],
        [
          "other-template-container",
          {
            type: "instance",
            id: "other-template-container",
            component: blockTemplateComponent,
            children: [],
          },
        ],
      ]),
      metas,
      props: new Map(),
      styleSources,
    });

    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: {
          id: "tx-1",
          payload: [
            {
              namespace: "instances",
              patches: [
                {
                  op: "replace",
                  path: ["block", "children", 1],
                  value: { type: "id", value: "new-instance" },
                },
                {
                  op: "add",
                  path: ["block", "children", 2],
                  value: { type: "id", value: "template-container" },
                },
                {
                  op: "add",
                  path: ["new-instance"],
                  value: {
                    type: "instance",
                    id: "new-instance",
                    component: "Box",
                    children: [],
                  },
                },
              ],
            },
          ],
        },
      })
    ).toEqual({ success: true });

    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("instances", [
          {
            op: "add",
            path: ["block", "children", 1],
            value: { type: "id", value: "other-template-container" },
          },
        ]),
      })
    ).toEqual({
      success: false,
      error: "Instance patch is not editable in content mode.",
    });
  });

  test("allows cleaning up any props from removed editable instances", () => {
    const capabilities = getContentModeCapabilities({
      instances,
      metas,
      props,
      styleSources,
    });

    expect(capabilities.editablePropIds.has("target-prop")).toBe(false);
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: {
          id: "tx-1",
          payload: [
            {
              namespace: "instances",
              patches: [
                { op: "remove", path: ["block", "children", 0] },
                { op: "remove", path: ["link"] },
              ],
            },
            {
              namespace: "props",
              patches: [
                { op: "remove", path: ["href-prop"] },
                { op: "remove", path: ["target-prop"] },
              ],
            },
          ],
        },
      })
    ).toEqual({ success: true });
  });

  test("allows cleaning up local styles from removed editable instances", () => {
    const styleDecl: StyleDecl = {
      styleSourceId: "local",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
    };
    const capabilities = getContentModeCapabilities({
      instances,
      metas,
      props,
      styleSources,
      styleSourceSelections: new Map([
        ["link", { instanceId: "link", values: ["local"] }],
      ]),
      styles: new Map([[getStyleDeclKey(styleDecl), styleDecl]]),
    });

    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: {
          id: "tx-1",
          payload: [
            {
              namespace: "instances",
              patches: [
                { op: "remove", path: ["block", "children", 0] },
                { op: "remove", path: ["link"] },
              ],
            },
            {
              namespace: "props",
              patches: [
                { op: "remove", path: ["href-prop"] },
                { op: "remove", path: ["target-prop"] },
              ],
            },
            {
              namespace: "styleSourceSelections",
              patches: [{ op: "remove", path: ["link"] }],
            },
            {
              namespace: "styleSources",
              patches: [{ op: "remove", path: ["local"] }],
            },
            {
              namespace: "styles",
              patches: [{ op: "remove", path: [getStyleDeclKey(styleDecl)] }],
            },
          ],
        },
      })
    ).toEqual({ success: true });
  });

  test("rejects removed editable instances that keep style cleanup data", () => {
    const styleDecl: StyleDecl = {
      styleSourceId: "local",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
    };
    const createCapabilities = () =>
      getContentModeCapabilities({
        instances,
        metas,
        props,
        styleSources,
        styleSourceSelections: new Map([
          ["link", { instanceId: "link", values: ["local"] }],
        ]),
        styles: new Map([[getStyleDeclKey(styleDecl), styleDecl]]),
      });
    const removeInstanceAndProps = [
      {
        namespace: "instances",
        patches: [
          { op: "remove" as const, path: ["block", "children", 0] },
          { op: "remove" as const, path: ["link"] },
        ],
      },
      {
        namespace: "props",
        patches: [
          { op: "remove" as const, path: ["href-prop"] },
          { op: "remove" as const, path: ["target-prop"] },
        ],
      },
    ];

    expect(
      validateContentModeTransaction({
        capabilities: createCapabilities(),
        transaction: {
          id: "tx-1",
          payload: removeInstanceAndProps,
        },
      })
    ).toEqual({
      success: false,
      error: "Removed content instances must not keep style selections.",
    });
    expect(
      validateContentModeTransaction({
        capabilities: createCapabilities(),
        transaction: {
          id: "tx-1",
          payload: [
            ...removeInstanceAndProps,
            {
              namespace: "styleSourceSelections",
              patches: [{ op: "remove", path: ["link"] }],
            },
          ],
        },
      })
    ).toEqual({
      success: false,
      error: "Removed content instances must not keep local style sources.",
    });
    expect(
      validateContentModeTransaction({
        capabilities: createCapabilities(),
        transaction: {
          id: "tx-1",
          payload: [
            ...removeInstanceAndProps,
            {
              namespace: "styleSourceSelections",
              patches: [{ op: "remove", path: ["link"] }],
            },
            {
              namespace: "styleSources",
              patches: [{ op: "remove", path: ["local"] }],
            },
          ],
        },
      })
    ).toEqual({
      success: false,
      error: "Removed content instances must not keep local styles.",
    });
  });

  test("rejects removed editable instances that keep props", () => {
    const capabilities = getContentModeCapabilities({
      instances,
      metas,
      props,
      styleSources,
    });

    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("instances", [
          { op: "remove", path: ["block", "children", 0] },
          { op: "remove", path: ["link"] },
        ]),
      })
    ).toEqual({
      success: false,
      error: "Removed content instances must not keep props.",
    });
  });

  test("rejects orphaning content instances", () => {
    const nestedInstances = new Map<string, Instance>([
      [
        "block",
        {
          type: "instance",
          id: "block",
          component: blockComponent,
          children: [{ type: "id", value: "parent" }],
        },
      ],
      [
        "parent",
        {
          type: "instance",
          id: "parent",
          component: "Box",
          children: [{ type: "id", value: "child" }],
        },
      ],
      [
        "child",
        {
          type: "instance",
          id: "child",
          component: "Box",
          children: [],
        },
      ],
    ]);
    const capabilities = getContentModeCapabilities({
      instances: nestedInstances,
      metas,
      props,
      styleSources,
    });

    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("instances", [
          { op: "remove", path: ["block", "children", 0] },
        ]),
      })
    ).toEqual({
      success: false,
      error: "Content instances must remain reachable from content roots.",
    });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("instances", [
          { op: "remove", path: ["block", "children", 0] },
          { op: "remove", path: ["parent"] },
        ]),
      })
    ).toEqual({
      success: false,
      error: "Content instances must remain reachable from content roots.",
    });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("instances", [
          { op: "remove", path: ["block", "children", 0] },
          { op: "remove", path: ["parent"] },
          { op: "remove", path: ["child"] },
        ]),
      })
    ).toEqual({ success: true });
  });

  test("rejects moving existing content instances between content roots", () => {
    const multiRootInstances = new Map<string, Instance>([
      [
        "block-1",
        {
          type: "instance",
          id: "block-1",
          component: blockComponent,
          children: [{ type: "id", value: "item" }],
        },
      ],
      [
        "block-2",
        {
          type: "instance",
          id: "block-2",
          component: blockComponent,
          children: [],
        },
      ],
      [
        "item",
        {
          type: "instance",
          id: "item",
          component: "Box",
          children: [],
        },
      ],
    ]);
    const capabilities = getContentModeCapabilities({
      instances: multiRootInstances,
      metas,
      props,
      styleSources,
    });

    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("instances", [
          { op: "remove", path: ["block-1", "children", 0] },
          {
            op: "add",
            path: ["block-2", "children", 0],
            value: { type: "id", value: "item" },
          },
        ]),
      })
    ).toEqual({
      success: false,
      error: "Content instances must stay within their content root.",
    });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("instances", [
          { op: "remove", path: ["block-1", "children", 0] },
          {
            op: "add",
            path: ["block-1", "children", 0],
            value: { type: "id", value: "item" },
          },
        ]),
      })
    ).toEqual({ success: true });
  });

  test("rejects referencing one content instance from multiple parents", () => {
    const multiRootInstances = new Map<string, Instance>([
      [
        "block-1",
        {
          type: "instance",
          id: "block-1",
          component: blockComponent,
          children: [{ type: "id", value: "item" }],
        },
      ],
      [
        "block-2",
        {
          type: "instance",
          id: "block-2",
          component: blockComponent,
          children: [],
        },
      ],
      [
        "item",
        {
          type: "instance",
          id: "item",
          component: "Box",
          children: [],
        },
      ],
    ]);
    const capabilities = getContentModeCapabilities({
      instances: multiRootInstances,
      metas,
      props,
      styleSources,
    });

    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("instances", [
          {
            op: "add",
            path: ["block-2", "children", 0],
            value: { type: "id", value: "item" },
          },
        ]),
      })
    ).toEqual({
      success: false,
      error: "Content instances must not be referenced multiple times.",
    });
  });

  test("rejects referencing one new content instance multiple times", () => {
    const capabilities = getContentModeCapabilities({
      instances: new Map([
        [
          "block",
          {
            type: "instance",
            id: "block",
            component: blockComponent,
            children: [],
          },
        ],
      ]),
      metas,
      props,
      styleSources,
    });

    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: {
          id: "tx-1",
          payload: [
            {
              namespace: "instances",
              patches: [
                {
                  op: "add",
                  path: ["new-instance"],
                  value: {
                    type: "instance",
                    id: "new-instance",
                    component: "Box",
                    children: [],
                  },
                },
                {
                  op: "add",
                  path: ["block", "children", 0],
                  value: { type: "id", value: "new-instance" },
                },
                {
                  op: "add",
                  path: ["block", "children", 1],
                  value: { type: "id", value: "new-instance" },
                },
              ],
            },
          ],
        },
      })
    ).toEqual({
      success: false,
      error: "Content instances must not be referenced multiple times.",
    });
  });

  test("allows asset changes", () => {
    const capabilities = getContentModeCapabilities({
      instances,
      metas,
      props,
      styleSources,
    });

    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("assets", [
          {
            op: "add",
            path: ["asset-1"],
            value: { id: "asset-1" },
          },
        ]),
      })
    ).toEqual({ success: true });
  });

  test("allows removing content page meta fields", () => {
    const capabilities = getContentModeCapabilities({
      instances,
      metas,
      props,
      styleSources,
    });

    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("pages", [
          {
            op: "remove",
            path: ["pages", "page-1", "meta", "socialImageUrl"],
          },
          {
            op: "remove",
            path: ["pages", "page-1", "meta", "socialImageAssetId"],
          },
        ]),
      })
    ).toEqual({ success: true });
  });

  test("allows choosing social image asset while clearing social image url", () => {
    const capabilities = getContentModeCapabilities({
      instances,
      metas,
      props,
      styleSources,
    });

    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("pages", [
          {
            op: "replace",
            path: ["pages", "page-1", "meta", "socialImageAssetId"],
            value: "asset-1",
          },
          {
            op: "replace",
            path: ["pages", "page-1", "meta", "socialImageUrl"],
            value: undefined,
          },
        ]),
      })
    ).toEqual({ success: true });
  });

  test("rejects content prop metadata changes", () => {
    const capabilities = getContentModeCapabilities({
      instances,
      metas,
      props,
      styleSources,
    });

    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("props", [
          { op: "replace", path: ["href-prop", "name"], value: "target" },
        ]),
      })
    ).toEqual({
      success: false,
      error: 'Prop "href-prop" is not editable in content mode.',
    });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("props", [
          { op: "remove", path: ["href-prop", "value"] },
        ]),
      })
    ).toEqual({
      success: false,
      error: 'Prop "href-prop" is not editable in content mode.',
    });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("props", [
          { op: "replace", path: ["href-prop", "value"], value: 1 },
        ]),
      })
    ).toEqual({
      success: false,
      error: 'Prop "href-prop" is not editable in content mode.',
    });
  });

  test("rejects instance metadata changes", () => {
    const capabilities = getContentModeCapabilities({
      instances,
      metas,
      props,
      styleSources,
    });

    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("instances", [
          { op: "replace", path: ["link", "component"], value: "Box" },
        ]),
      })
    ).toEqual({
      success: false,
      error: "Instance patch is not editable in content mode.",
    });
  });

  test("allows whole-instance replacement when only children change", () => {
    const capabilities = getContentModeCapabilities({
      instances: new Map([
        [
          "block",
          {
            type: "instance",
            id: "block",
            component: blockComponent,
            children: [{ type: "id", value: "list-item" }],
          },
        ],
        [
          "list-item",
          {
            type: "instance",
            id: "list-item",
            component: "ws:element",
            tag: "li",
            label: "List Item",
            children: [{ type: "text", value: "Old text" }],
          },
        ],
      ]),
      metas,
      props,
      styleSources,
    });

    const result = applyContentModeTransaction({
      capabilities,
      transaction: transaction("instances", [
        {
          op: "replace",
          path: ["list-item"],
          value: {
            type: "instance",
            id: "list-item",
            component: "ws:element",
            tag: "li",
            label: "List Item",
            children: [{ type: "text", value: "New text" }],
          },
        },
      ]),
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.capabilities.instances.get("list-item")?.children).toEqual([
        { type: "text", value: "New text" },
      ]);
    }
  });

  test("rejects whole-instance replacement when metadata changes", () => {
    const capabilities = getContentModeCapabilities({
      instances: new Map([
        [
          "block",
          {
            type: "instance",
            id: "block",
            component: blockComponent,
            children: [{ type: "id", value: "list-item" }],
          },
        ],
        [
          "list-item",
          {
            type: "instance",
            id: "list-item",
            component: "ws:element",
            tag: "li",
            label: "List Item",
            children: [{ type: "text", value: "Old text" }],
          },
        ],
      ]),
      metas,
      props,
      styleSources,
    });

    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("instances", [
          {
            op: "replace",
            path: ["list-item"],
            value: {
              type: "instance",
              id: "list-item",
              component: "ws:element",
              tag: "div",
              label: "List Item",
              children: [{ type: "text", value: "New text" }],
            },
          },
        ]),
      })
    ).toEqual({
      success: false,
      error: "Instance patch is not editable in content mode.",
    });
  });

  test("rejects whole-instance replacement with outside child reference", () => {
    const capabilities = getContentModeCapabilities({
      instances: new Map([
        [
          "block",
          {
            type: "instance",
            id: "block",
            component: blockComponent,
            children: [{ type: "id", value: "list-item" }],
          },
        ],
        [
          "list-item",
          {
            type: "instance",
            id: "list-item",
            component: "ws:element",
            tag: "li",
            label: "List Item",
            children: [{ type: "text", value: "Old text" }],
          },
        ],
        [
          "outside",
          {
            type: "instance",
            id: "outside",
            component: "Box",
            children: [],
          },
        ],
      ]),
      metas,
      props,
      styleSources,
    });

    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("instances", [
          {
            op: "replace",
            path: ["list-item"],
            value: {
              type: "instance",
              id: "list-item",
              component: "ws:element",
              tag: "li",
              label: "List Item",
              children: [{ type: "id", value: "outside" }],
            },
          },
        ]),
      })
    ).toEqual({
      success: false,
      error: "Instance patch is not editable in content mode.",
    });
  });

  test("allows limited page field patches", () => {
    const capabilities = getContentModeCapabilities({
      instances,
      metas,
      props,
      styleSources,
    });

    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("pages", [
          { op: "replace", path: ["pages", "page-1", "name"], value: "About" },
          {
            op: "replace",
            path: ["pages", "page-1", "path"],
            value: "/about",
          },
          {
            op: "replace",
            path: ["pages", "page-1", "title"],
            value: "About",
          },
          {
            op: "replace",
            path: ["pages", "page-1", "meta", "description"],
            value: "About us",
          },
          {
            op: "replace",
            path: ["pages", "page-1", "meta", "excludePageFromSearch"],
            value: "false",
          },
          {
            op: "replace",
            path: ["pages", "page-1", "meta", "language"],
            value: "en-US",
          },
          {
            op: "replace",
            path: ["pages", "page-1", "meta", "socialImageAssetId"],
            value: "asset-1",
          },
          {
            op: "add",
            path: ["pages", "page-1", "meta", "socialImageAssetId"],
            value: undefined,
          },
          {
            op: "replace",
            path: ["pages", "page-1", "meta", "socialImageUrl"],
            value: "https://example.com/image.png",
          },
          {
            op: "replace",
            path: ["pages", "page-1", "meta", "custom"],
            value: [{ property: "og:type", content: "website" }],
          },
          {
            op: "add",
            path: ["pages", "page-1", "meta", "custom", 0],
            value: { property: "", content: '""' },
          },
          {
            op: "replace",
            path: ["pages", "page-1", "meta", "custom", 0, "property"],
            value: "og:title",
          },
          {
            op: "replace",
            path: ["pages", "page-1", "meta", "custom", 0, "content"],
            value: '"About"',
          },
          {
            op: "remove",
            path: ["pages", "page-1", "meta", "custom", 0],
          },
        ]),
      })
    ).toEqual({ success: true });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("pages", [
          { op: "remove", path: ["pages", "page-1", "name"] },
        ]),
      })
    ).toEqual({
      success: false,
      error: "Page patch is not editable in content mode.",
    });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("pages", [
          {
            op: "add",
            path: ["pages", "page-1", "isDraft"],
            value: true,
          },
        ]),
      })
    ).toEqual({
      success: false,
      error: "Page patch is not editable in content mode.",
    });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("pages", [
          {
            op: "replace",
            path: ["pages", "page-1", "meta", "custom", 0, "content"],
            value: 1,
          },
        ]),
      })
    ).toEqual({
      success: false,
      error: "Page patch is not editable in content mode.",
    });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("pages", [
          {
            op: "replace",
            path: ["pages", "page-1", "meta", "custom", 0, "name"],
            value: "og:type",
          },
        ]),
      })
    ).toEqual({
      success: false,
      error: "Page patch is not editable in content mode.",
    });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("pages", [
          {
            op: "replace",
            path: ["pages", "page-1"],
            value: {
              id: "page-1",
              name: "About",
              path: "/about",
              title: "About",
              rootInstanceId: "root-1",
              meta: {},
            },
          },
        ]),
      })
    ).toEqual({
      success: false,
      error: "Page patch is not editable in content mode.",
    });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("pages", [
          {
            op: "replace",
            path: ["pages", "page-1", "meta"],
            value: { description: "About us" },
          },
        ]),
      })
    ).toEqual({
      success: false,
      error: "Page patch is not editable in content mode.",
    });
    for (const metaField of [
      "auth",
      "redirect",
      "status",
      "documentType",
      "content",
    ]) {
      expect(
        validateContentModeTransaction({
          capabilities,
          transaction: transaction("pages", [
            {
              op: "replace",
              path: ["pages", "page-1", "meta", metaField],
              value: "value",
            },
          ]),
        })
      ).toEqual({
        success: false,
        error: "Page patch is not editable in content mode.",
      });
    }
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("pages", [
          { op: "replace", path: ["pages", "page-1", "title"], value: 1 },
        ]),
      })
    ).toEqual({
      success: false,
      error: "Page patch is not editable in content mode.",
    });
    for (const path of ["/posts/:slug", "/docs/*", "https://example.com"]) {
      expect(
        validateContentModeTransaction({
          capabilities,
          transaction: transaction("pages", [
            {
              op: "replace",
              path: ["pages", "page-1", "path"],
              value: path,
            },
          ]),
        })
      ).toEqual({
        success: false,
        error: "Page patch is not editable in content mode.",
      });
    }
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("pages", [
          {
            op: "replace",
            path: ["pages", "page-1", "meta", "custom"],
            value: [{ property: "og:type", content: 1 }],
          },
        ]),
      })
    ).toEqual({
      success: false,
      error: "Page patch is not editable in content mode.",
    });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("pages", [
          {
            op: "replace",
            path: ["pages", "page-1", "meta", "auth", "path"],
            value: "/private",
          },
        ]),
      })
    ).toEqual({
      success: false,
      error: "Page patch is not editable in content mode.",
    });

    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: {
          id: "tx-3",
          payload: [
            {
              namespace: "instances",
              patches: [
                {
                  op: "add",
                  path: ["new-root"],
                  value: {
                    type: "instance",
                    id: "new-root",
                    component: "Body",
                    children: [],
                  },
                },
              ],
            },
            {
              namespace: "pages",
              patches: [
                {
                  op: "add",
                  path: ["pages", "new-page"],
                  value: {
                    id: "new-page",
                    name: "New page",
                    path: "/new-page",
                    title: "New page",
                    rootInstanceId: "new-root",
                    marketplace: { include: true },
                    meta: {},
                  },
                },
              ],
            },
          ],
        },
      })
    ).toEqual({
      success: false,
      error: "Page patch is not editable in content mode.",
    });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: {
          id: "tx-3",
          payload: [
            {
              namespace: "instances",
              patches: [
                {
                  op: "add",
                  path: ["new-root-3"],
                  value: {
                    type: "instance",
                    id: "new-root-3",
                    component: "Body",
                    children: [],
                  },
                },
              ],
            },
            {
              namespace: "pages",
              patches: [
                {
                  op: "add",
                  path: ["pages", "new-page-3"],
                  value: {
                    id: "new-page-3",
                    name: "New page 3",
                    path: "/new-page-3",
                    title: "New page 3",
                    rootInstanceId: "new-root-3",
                    meta: { custom: [{ property: "og:type", content: 1 }] },
                  },
                },
              ],
            },
          ],
        },
      })
    ).toEqual({
      success: false,
      error: "Page patch is not editable in content mode.",
    });
  });

  test("allows creating a page when its root instance is added in the same transaction", () => {
    const capabilities = getContentModeCapabilities({
      instances,
      metas,
      props,
      styleSources,
    });

    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: {
          id: "tx-1",
          payload: [
            {
              namespace: "instances",
              patches: [
                {
                  op: "add",
                  path: ["new-root"],
                  value: {
                    type: "instance",
                    id: "new-root",
                    component: "Body",
                    children: [],
                  },
                },
              ],
            },
            {
              namespace: "pages",
              patches: [
                {
                  op: "add",
                  path: ["pages", "new-page"],
                  value: {
                    id: "new-page",
                    name: "New page",
                    path: "/new-page",
                    title: "New page",
                    rootInstanceId: "new-root",
                    meta: {
                      description: "Description",
                      custom: [{ property: "og:type", content: "website" }],
                    },
                  },
                },
                {
                  op: "add",
                  path: ["folders", "root", "children", 0],
                  value: "new-page",
                },
              ],
            },
          ],
        },
      })
    ).toEqual({ success: true });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: {
          id: "tx-3",
          payload: [
            {
              namespace: "instances",
              patches: [
                {
                  op: "add",
                  path: ["new-root-3"],
                  value: {
                    type: "instance",
                    id: "new-root-3",
                    component: "Body",
                    children: [{ type: "id", value: "link" }],
                  },
                },
              ],
            },
            {
              namespace: "pages",
              patches: [
                {
                  op: "add",
                  path: ["pages", "new-page-3"],
                  value: {
                    id: "new-page-3",
                    name: "New page 3",
                    path: "/new-page-3",
                    title: "New page 3",
                    rootInstanceId: "new-root-3",
                    meta: {},
                  },
                },
              ],
            },
          ],
        },
      })
    ).toEqual({
      success: false,
      error: "Page patch is not editable in content mode.",
    });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: {
          id: "tx-dynamic-path",
          payload: [
            {
              namespace: "instances",
              patches: [
                {
                  op: "add",
                  path: ["new-root-dynamic"],
                  value: {
                    type: "instance",
                    id: "new-root-dynamic",
                    component: "Body",
                    children: [],
                  },
                },
              ],
            },
            {
              namespace: "pages",
              patches: [
                {
                  op: "add",
                  path: ["pages", "new-page-dynamic"],
                  value: {
                    id: "new-page-dynamic",
                    name: "New page dynamic",
                    path: "/new-page/:slug",
                    title: "New page dynamic",
                    rootInstanceId: "new-root-dynamic",
                    meta: {},
                  },
                },
              ],
            },
          ],
        },
      })
    ).toEqual({
      success: false,
      error: "Page patch is not editable in content mode.",
    });
  });

  test("rejects page creation with build-owned fields", () => {
    const capabilities = getContentModeCapabilities({
      instances,
      metas,
      props,
      styleSources,
    });

    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: {
          id: "tx-1",
          payload: [
            {
              namespace: "instances",
              patches: [
                {
                  op: "add",
                  path: ["new-root"],
                  value: {
                    type: "instance",
                    id: "new-root",
                    component: "Body",
                    children: [],
                  },
                },
              ],
            },
            {
              namespace: "pages",
              patches: [
                {
                  op: "add",
                  path: ["pages", "new-page"],
                  value: {
                    id: "new-page",
                    name: "New page",
                    path: "/new-page",
                    title: "New page",
                    rootInstanceId: "new-root",
                    systemDataSourceId: "system",
                    meta: {},
                  },
                },
              ],
            },
          ],
        },
      })
    ).toEqual({
      success: false,
      error: "Page patch is not editable in content mode.",
    });

    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: {
          id: "tx-2",
          payload: [
            {
              namespace: "instances",
              patches: [
                {
                  op: "add",
                  path: ["new-root"],
                  value: {
                    type: "instance",
                    id: "new-root",
                    component: "Body",
                    children: [],
                  },
                },
              ],
            },
            {
              namespace: "pages",
              patches: [
                {
                  op: "add",
                  path: ["pages", "new-page"],
                  value: {
                    id: "new-page",
                    name: "New page",
                    path: "/new-page",
                    title: "New page",
                    rootInstanceId: "new-root",
                    meta: {
                      auth: { method: "basic", login: "u", password: "p" },
                    },
                  },
                },
              ],
            },
          ],
        },
      })
    ).toEqual({
      success: false,
      error: "Page patch is not editable in content mode.",
    });
  });

  test("allows styles only for local style sources created in the same transaction", () => {
    const capabilities = getContentModeCapabilities({
      instances,
      metas,
      props,
      styleSources,
    });
    const styleDecl: StyleDecl = {
      styleSourceId: "new-local",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
    };

    const result = validateContentModeTransaction({
      capabilities,
      transaction: {
        id: "tx-1",
        payload: [
          {
            namespace: "instances",
            patches: [
              {
                op: "add",
                path: ["new-link"],
                value: {
                  type: "instance",
                  id: "new-link",
                  component: "Link",
                  children: [],
                },
              },
              {
                op: "add",
                path: ["block", "children", 0],
                value: { type: "id", value: "new-link" },
              },
            ],
          },
          {
            namespace: "styleSourceSelections",
            patches: [
              {
                op: "add",
                path: ["new-link"],
                value: { instanceId: "new-link", values: ["new-local"] },
              },
            ],
          },
          {
            namespace: "styles",
            patches: [
              {
                op: "add",
                path: [getStyleDeclKey(styleDecl)],
                value: styleDecl,
              },
            ],
          },
          {
            namespace: "styleSources",
            patches: [
              {
                op: "add",
                path: ["new-local"],
                value: { type: "local", id: "new-local" },
              },
            ],
          },
        ],
      },
    });

    expect(result).toEqual({ success: true });
    expect(capabilities.styleSources.has("new-local")).toBe(false);

    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("styleSources", [
          {
            op: "add",
            path: ["new-token"],
            value: { type: "token", id: "new-token", name: "Token" },
          },
        ]),
      })
    ).toEqual({
      success: false,
      error: "Only new local style sources are editable in content mode.",
    });

    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("styles", [
          {
            op: "replace",
            path: [
              getStyleDeclKey({
                ...styleDecl,
                styleSourceId: "local",
              }),
            ],
            value: { ...styleDecl, styleSourceId: "local" },
          },
        ]),
      })
    ).toEqual({
      success: false,
      error:
        "Only styles for new local style sources are editable in content mode.",
    });

    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: {
          id: "tx-2",
          payload: [
            {
              namespace: "styles",
              patches: [
                {
                  op: "add",
                  path: [getStyleDeclKey(styleDecl)],
                  value: styleDecl,
                },
              ],
            },
            {
              namespace: "styleSources",
              patches: [
                {
                  op: "add",
                  path: ["new-local"],
                  value: { type: "local", id: "new-local" },
                },
              ],
            },
          ],
        },
      })
    ).toEqual({
      success: false,
      error:
        "New local style sources must be selected by new content instances.",
    });

    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("styleSources", [
          {
            op: "add",
            path: ["unused-local"],
            value: { type: "local", id: "unused-local" },
          },
        ]),
      })
    ).toEqual({
      success: false,
      error:
        "New local style sources must be selected by new content instances.",
    });
    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: {
          id: "tx-3",
          payload: [
            {
              namespace: "instances",
              patches: [
                {
                  op: "add",
                  path: ["new-empty-style-link"],
                  value: {
                    type: "instance",
                    id: "new-empty-style-link",
                    component: "Link",
                    children: [],
                  },
                },
                {
                  op: "add",
                  path: ["block", "children", 0],
                  value: { type: "id", value: "new-empty-style-link" },
                },
              ],
            },
            {
              namespace: "styleSources",
              patches: [
                {
                  op: "add",
                  path: ["empty-local"],
                  value: { type: "local", id: "empty-local" },
                },
              ],
            },
            {
              namespace: "styleSourceSelections",
              patches: [
                {
                  op: "add",
                  path: ["new-empty-style-link"],
                  value: {
                    instanceId: "new-empty-style-link",
                    values: ["empty-local"],
                  },
                },
              ],
            },
          ],
        },
      })
    ).toEqual({
      success: false,
      error: "New local style sources must have styles in content mode.",
    });
  });

  test("rejects styles for missing breakpoints", () => {
    const capabilities = getContentModeCapabilities({
      instances,
      metas,
      props,
      styleSources,
      breakpoints: new Map([["base", { id: "base", label: "Base" }]]),
    });
    const styleDecl: StyleDecl = {
      styleSourceId: "missing-breakpoint-local",
      breakpointId: "missing",
      property: "color",
      value: { type: "keyword", value: "red" },
    };

    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: {
          id: "tx-missing-breakpoint",
          payload: [
            {
              namespace: "instances",
              patches: [
                {
                  op: "add",
                  path: ["new-missing-breakpoint-link"],
                  value: {
                    type: "instance",
                    id: "new-missing-breakpoint-link",
                    component: "Link",
                    children: [],
                  },
                },
                {
                  op: "add",
                  path: ["block", "children", 0],
                  value: { type: "id", value: "new-missing-breakpoint-link" },
                },
              ],
            },
            {
              namespace: "styleSources",
              patches: [
                {
                  op: "add",
                  path: ["missing-breakpoint-local"],
                  value: { type: "local", id: "missing-breakpoint-local" },
                },
              ],
            },
            {
              namespace: "styleSourceSelections",
              patches: [
                {
                  op: "add",
                  path: ["new-missing-breakpoint-link"],
                  value: {
                    instanceId: "new-missing-breakpoint-link",
                    values: ["missing-breakpoint-local"],
                  },
                },
              ],
            },
            {
              namespace: "styles",
              patches: [
                {
                  op: "add",
                  path: [
                    getStyleDeclKey({
                      ...styleDecl,
                    }),
                  ],
                  value: styleDecl,
                },
              ],
            },
          ],
        },
      })
    ).toEqual({
      success: false,
      error:
        "Only styles for existing breakpoints are editable in content mode.",
    });
  });

  test("rejects design namespaces", () => {
    const capabilities = getContentModeCapabilities({
      instances,
      metas,
      props,
      styleSources,
    });

    expect(
      validateContentModeTransaction({
        capabilities,
        transaction: transaction("styles", [
          { op: "add", path: ["style-1"], value: {} },
        ]),
      })
    ).toEqual({
      success: false,
      error:
        "Only styles for new local style sources are editable in content mode.",
    });
  });
});
