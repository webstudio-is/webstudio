import { describe, expect, test } from "vitest";
import type { Instance, Prop } from "@webstudio-is/sdk";
import {
  clonePropForInstance,
  createPropDeletePayload,
  createPropBindingFromInput,
  createPropClonePatches,
  createStartingPropValueFromMeta,
  createPropRenamePayload,
  createPropUpsertPayload,
  createValidatedPropBindingFromInput,
  createValidatedPropValueFromInput,
  createPropValue,
  findProp,
  getDefaultPropMetaForType,
  getPropDeletePlan,
  getPropIdsToDelete,
  getPropValueErrors,
  isPrimitiveValue,
  propBindingInput,
  propUpdatesInput,
  propValueInput,
  replacePropText,
  showAttributeMeta,
  updateProps,
  validatePrimitiveValue,
} from "./props";

const image: Instance = {
  type: "instance",
  id: "image-id",
  component: "Image",
  children: [],
};

const prop = (name: string, overrides: Partial<Prop> = {}): Prop =>
  ({
    id: `${name}-id`,
    instanceId: image.id,
    name,
    type: "string",
    value: "",
    ...overrides,
  }) as Prop;

test("validates only prop replacements selected by the limit", () => {
  const jsonLd: Instance = {
    type: "instance",
    id: "json-ld",
    component: "JsonLd",
    children: [],
  };
  const result = replacePropText(
    {
      instances: new Map([
        [image.id, image],
        [jsonLd.id, jsonLd],
      ]),
      props: new Map([
        ["first", prop("title", { id: "first", value: "old" })],
        [
          "second",
          {
            id: "second",
            instanceId: jsonLd.id,
            name: "code",
            type: "string",
            value: '{"name":"old"}',
          } satisfies Prop,
        ],
      ]),
    },
    {
      find: "old",
      replace: '"',
      match: "substring",
      limit: 1,
    }
  );

  expect(result).toMatchObject({
    result: {
      changedCount: 1,
      matchingPropCount: 2,
      truncated: true,
      matches: [{ propId: "first", before: "old", after: '"' }],
    },
  });
});

test("does not invalidate props when text replacement finds no matches", () => {
  const result = replacePropText(
    {
      instances: new Map([[image.id, image]]),
      props: new Map([
        ["title", prop("title", { id: "title", value: "Existing" })],
      ]),
    },
    {
      find: "Not present",
      replace: "Replacement",
      match: "substring",
      limit: 100,
    }
  );

  expect(result.payload).toEqual([]);
  expect(result.invalidatesNamespaces).toEqual([]);
  expect(result.result).toMatchObject({
    changedCount: 0,
    matchingPropCount: 0,
  });
});

test("rejects client-supplied prop ids on prop upsert inputs", () => {
  expect(
    propValueInput.safeParse({
      propId: "client-prop-id",
      instanceId: "instance-id",
      name: "title",
      type: "string",
      value: "Title",
    }).success
  ).toBe(false);
  expect(
    propBindingInput.safeParse({
      propId: "client-prop-id",
      instanceId: "instance-id",
      name: "title",
      binding: { type: "expression", value: "title" },
    }).success
  ).toBe(false);
});

describe("findProp", () => {
  test("finds a prop by instance id and name", () => {
    expect(findProp([prop("src")], image.id, "src")?.id).toBe("src-id");
    expect(findProp([prop("src")], "other-id", "src")).toBeUndefined();
  });
});

test("defines show attribute metadata in runtime", () => {
  expect(showAttributeMeta).toEqual({
    label: "Show",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: true,
    description:
      "Removes the instance from the DOM. Breakpoints have no effect on this setting.",
  });
});

describe("createPropValue", () => {
  test("creates props through the sdk schema", () => {
    expect(
      createPropValue({
        id: "prop-id",
        instanceId: "instance-id",
        name: "label",
        type: "string",
        value: "Label",
      })
    ).toEqual({
      id: "prop-id",
      instanceId: "instance-id",
      name: "label",
      type: "string",
      value: "Label",
    });
  });

  test("rejects invalid prop values", () => {
    expect(() =>
      createPropValue({
        id: "prop-id",
        instanceId: "instance-id",
        name: "visible",
        type: "boolean",
        value: "not boolean",
      })
    ).toThrow();
  });
});

describe("primitive expression results", () => {
  test("accepts values that can be saved into primitive controls", () => {
    expect(isPrimitiveValue("text")).toBe(true);
    expect(isPrimitiveValue(1)).toBe(true);
    expect(isPrimitiveValue(false)).toBe(true);
    expect(isPrimitiveValue(null)).toBe(true);
    expect(isPrimitiveValue(undefined)).toBe(true);
  });

  test("rejects values that cannot be saved into primitive controls", () => {
    expect(isPrimitiveValue({})).toBe(false);
    expect(isPrimitiveValue([])).toBe(false);
    expect(isPrimitiveValue(() => undefined)).toBe(false);
    expect(isPrimitiveValue(Symbol("value"))).toBe(false);
  });

  test("formats a field-specific validation message", () => {
    expect(validatePrimitiveValue({}, "Title")).toBe(
      "Title expects a primitive value (string, number, boolean, null, or undefined), not an object, array, or function"
    );
    expect(validatePrimitiveValue("ok", "Title")).toBeUndefined();
  });
});

describe("prop input creators", () => {
  test("parse prop value and binding inputs used by the API", () => {
    expect(
      propValueInput.parse({
        instanceId: "instance-id",
        name: "label",
        type: "string",
        value: "Label",
      })
    ).toEqual({
      instanceId: "instance-id",
      name: "label",
      type: "string",
      value: "Label",
    });

    expect(
      propBindingInput.parse({
        instanceId: "instance-id",
        name: "value",
        binding: { type: "expression", value: "system.search.value" },
      })
    ).toEqual({
      instanceId: "instance-id",
      name: "value",
      binding: { type: "expression", value: "system.search.value" },
    });
  });

  test("reject invalid prop input types", () => {
    expect(() =>
      propValueInput.parse({
        instanceId: "instance-id",
        name: "label",
        type: "invalid",
        value: "Label",
      })
    ).toThrow();

    expect(() =>
      propBindingInput.parse({
        instanceId: "instance-id",
        name: "value",
        binding: { type: "string", value: "Label" },
      })
    ).toThrow();

    expect(() =>
      propValueInput.parse({
        instanceId: "instance-id",
        name: "label",
        type: "expression",
        value: "invalid {",
      })
    ).toThrow();

    expect(() =>
      propBindingInput.parse({
        instanceId: "instance-id",
        name: "value",
        binding: { type: "expression", value: "invalid {" },
      })
    ).toThrow();
  });

  test("reports malformed prop update batch items by index", () => {
    const result = propUpdatesInput.safeParse({
      updates: [
        {
          instanceId: "textarea-1",
          name: "placeholder",
          type: "string",
          value: "Describe your project",
        },
        {
          instanceId: "textarea-2",
          name: "placeholder",
          type: "string",
          value: { text: "Describe your project" },
        },
        {
          instanceId: "textarea-3",
          name: "placeholder",
          type: "boolean",
          value: "Describe your project",
        },
      ],
    });

    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["updates", 1, "value"],
            message: expect.stringContaining("expected string"),
          }),
          expect.objectContaining({
            path: ["updates", 2, "value"],
            message: expect.stringContaining("expected boolean"),
          }),
        ])
      );
    }
  });

  test("creates prop values and bindings from input", () => {
    expect(
      createPropBindingFromInput({
        id: "prop-id",
        instanceId: "instance-id",
        name: "value",
        binding: { type: "expression", value: "value" },
      })
    ).toEqual({
      id: "prop-id",
      instanceId: "instance-id",
      name: "value",
      type: "expression",
      value: "value",
    });
  });
});

describe("validated prop input creators", () => {
  test("create valid prop values and bindings", () => {
    expect(
      createValidatedPropValueFromInput(
        {
          instanceId: "instance-id",
          name: "label",
          type: "string",
          value: "Label",
        },
        () => "prop-id"
      )
    ).toEqual({
      success: true,
      prop: {
        id: "prop-id",
        instanceId: "instance-id",
        name: "label",
        type: "string",
        value: "Label",
      },
    });

    expect(
      createValidatedPropBindingFromInput(
        {
          instanceId: "instance-id",
          name: "value",
          binding: { type: "parameter", value: "param" },
        },
        () => "prop-id"
      )
    ).toEqual({
      success: true,
      prop: {
        id: "prop-id",
        instanceId: "instance-id",
        name: "value",
        type: "parameter",
        value: "param",
      },
    });
  });

  test("return expression errors without creating props", () => {
    expect(
      createValidatedPropValueFromInput({
        instanceId: "instance-id",
        name: "value",
        type: "expression",
        value: "invalid {",
      })
    ).toEqual({
      success: false,
      errors: expect.arrayContaining([expect.any(String)]),
    });

    expect(
      createValidatedPropBindingFromInput({
        instanceId: "instance-id",
        name: "value",
        binding: { type: "expression", value: "invalid {" },
      })
    ).toEqual({
      success: false,
      errors: expect.arrayContaining([expect.any(String)]),
    });
  });
});

describe("clonePropForInstance", () => {
  test("clones prop with new prop and instance ids", () => {
    expect(
      clonePropForInstance({
        prop: prop("title", { value: "Title" }),
        propId: "new-prop",
        instanceId: "new-instance",
      })
    ).toEqual({
      id: "new-prop",
      instanceId: "new-instance",
      name: "title",
      type: "string",
      value: "Title",
    });
  });
});

describe("createPropClonePatches", () => {
  test("clones props for copied instances", () => {
    expect(
      createPropClonePatches({
        nextIdById: new Map([[image.id, "new-instance"]]),
        props: [
          prop("title", { value: "Title" }),
          prop("ignored", { instanceId: "other-instance" }),
        ],
        createId: () => "new-prop",
      })
    ).toEqual([
      {
        op: "add",
        path: ["new-prop"],
        value: {
          id: "new-prop",
          instanceId: "new-instance",
          name: "title",
          type: "string",
          value: "Title",
        },
      },
    ]);
  });
});

describe("createPropUpsertPayload", () => {
  test("creates add and replace patches", () => {
    const nextExisting = prop("src", { id: "incoming-src-id", value: "next" });
    const nextNew = prop("alt", { id: "alt-id", value: "Alt" });

    expect(
      createPropUpsertPayload({
        props: [prop("src", { value: "prev" })],
        nextProps: [nextExisting, nextNew],
      })
    ).toEqual({
      propIds: ["src-id", "alt-id"],
      payload: [
        {
          namespace: "props",
          patches: [
            {
              op: "replace",
              path: ["src-id"],
              value: { ...nextExisting, id: "src-id" },
            },
            { op: "add", path: ["alt-id"], value: nextNew },
          ],
        },
      ],
    });
  });

  test("removes duplicate props with the same instance and name", () => {
    const nextProp = prop("src", { id: "src-id", value: "next" });

    expect(
      createPropUpsertPayload({
        props: [
          prop("src", { id: "src-id", value: "prev" }),
          prop("src", { id: "duplicate-src-id", value: "duplicate" }),
        ],
        nextProps: [nextProp],
      })
    ).toEqual({
      propIds: ["src-id"],
      payload: [
        {
          namespace: "props",
          patches: [
            { op: "remove", path: ["duplicate-src-id"] },
            { op: "replace", path: ["src-id"], value: nextProp },
          ],
        },
      ],
    });
  });
});

describe("updateProps", () => {
  test("rejects invalid HtmlEmbed code updates", () => {
    const htmlEmbed: Instance = {
      type: "instance",
      id: "embed-id",
      component: "HtmlEmbed",
      children: [],
    };

    expect(() =>
      updateProps(
        {
          instances: new Map([[htmlEmbed.id, htmlEmbed]]),
          props: new Map(),
        },
        {
          updates: [
            {
              instanceId: htmlEmbed.id,
              name: "code",
              type: "string",
              value: '<section></section attribute="value">',
            },
          ],
        },
        { createId: () => "code-prop-id" }
      )
    ).toThrow("Entered HTML has a validation error.");
  });

  test("validates JsonLd code updates", () => {
    const jsonLd: Instance = {
      type: "instance",
      id: "json-ld-id",
      component: "JsonLd",
      children: [],
    };
    const state = {
      instances: new Map([[jsonLd.id, jsonLd]]),
      props: new Map(),
    };

    expect(() =>
      updateProps(
        state,
        {
          updates: [
            {
              instanceId: jsonLd.id,
              name: "code",
              type: "string",
              value: "not json",
            },
          ],
        },
        { createId: () => "code-prop-id" }
      )
    ).toThrow("JSON-LD $: JSON-LD must be a valid JSON object or array.");

    expect(() =>
      updateProps(
        state,
        {
          updates: [
            {
              instanceId: jsonLd.id,
              name: "code",
              type: "string",
              value: '{"@context":"https://schema.org","@type":1}',
            },
          ],
        },
        { createId: () => "code-prop-id" }
      )
    ).toThrow('JSON-LD $["@type"]: @type must be a non-empty string');

    expect(() =>
      updateProps(
        state,
        {
          updates: [
            {
              instanceId: jsonLd.id,
              name: "code",
              type: "json",
              value: { "@context": "https://schema.org" },
            },
          ],
        },
        { createId: () => "code-prop-id" }
      )
    ).toThrow('JSON-LD code must use prop type "string".');

    expect(() =>
      updateProps(
        state,
        {
          updates: [
            {
              instanceId: jsonLd.id,
              name: "code",
              type: "expression",
              value: "jsonLdData",
            },
          ],
        },
        { createId: () => "code-prop-id" }
      )
    ).not.toThrow();

    expect(() =>
      updateProps(
        state,
        {
          updates: [
            {
              instanceId: jsonLd.id,
              name: "code",
              type: "string",
              value: '{"@context":"https://schema.org"}',
            },
          ],
        },
        { createId: () => "code-prop-id" }
      )
    ).not.toThrow();
  });

  test("allows non-html code props to use plain strings", () => {
    const codeText: Instance = {
      type: "instance",
      id: "code-text-id",
      component: "CodeText",
      children: [],
    };

    expect(
      updateProps(
        {
          instances: new Map([[codeText.id, codeText]]),
          props: new Map(),
        },
        {
          updates: [
            {
              instanceId: codeText.id,
              name: "code",
              type: "string",
              value: '<section></section attribute="value">',
            },
          ],
        },
        { createId: () => "code-prop-id" }
      ).payload
    ).toEqual([
      {
        namespace: "props",
        patches: [
          {
            op: "add",
            path: ["code-prop-id"],
            value: {
              id: "code-prop-id",
              instanceId: codeText.id,
              name: "code",
              type: "string",
              value: '<section></section attribute="value">',
            },
          },
        ],
      },
    ]);
  });
});

describe("createPropRenamePayload", () => {
  test("creates remove and add patches for renamed props", () => {
    const classNameProp = prop("className", {
      id: "box:className",
      instanceId: "box",
    });

    expect(
      createPropRenamePayload({
        props: [classNameProp],
        renames: [
          {
            propId: "box:className",
            name: "class",
            propIdPrefix: "box",
          },
        ],
      })
    ).toEqual({
      propIds: ["box:class"],
      payload: [
        {
          namespace: "props",
          patches: [
            { op: "remove", path: ["box:className"] },
            {
              op: "add",
              path: ["box:class"],
              value: {
                ...classNameProp,
                id: "box:class",
                name: "class",
              },
            },
          ],
        },
      ],
    });
  });
});

describe("createStartingPropValueFromMeta", () => {
  test("returns defaults for primitive editable prop metas", () => {
    expect(
      createStartingPropValueFromMeta(
        {
          type: "string",
          control: "text",
          required: false,
          defaultValue: "Text",
        },
        false
      )
    ).toEqual({ type: "string", value: "Text" });
    expect(
      createStartingPropValueFromMeta(
        {
          type: "number",
          control: "number",
          required: false,
          defaultValue: 12,
        },
        false
      )
    ).toEqual({ type: "number", value: 12 });
    expect(
      createStartingPropValueFromMeta(
        {
          type: "boolean",
          control: "boolean",
          required: false,
        },
        true
      )
    ).toEqual({ type: "boolean", value: true });
  });

  test("returns defaults for list and action metas", () => {
    expect(
      createStartingPropValueFromMeta(
        {
          type: "string[]",
          control: "multi-select",
          required: false,
          options: ["a", "b"],
        },
        false
      )
    ).toEqual({ type: "string[]", value: [] });
    expect(
      createStartingPropValueFromMeta(
        {
          type: "action",
          control: "action",
          required: false,
        },
        false
      )
    ).toEqual({ type: "action", value: [] });
  });

  test("does not create a starting value for file controls", () => {
    expect(
      createStartingPropValueFromMeta(
        {
          type: "string",
          control: "file",
          required: false,
        },
        false
      )
    ).toBeUndefined();
  });
});

describe("getDefaultPropMetaForType", () => {
  test("returns fallback meta for primitive prop types", () => {
    expect(getDefaultPropMetaForType("string")).toEqual({
      type: "string",
      control: "text",
      required: false,
    });
    expect(getDefaultPropMetaForType("number")).toEqual({
      type: "number",
      control: "number",
      required: false,
    });
    expect(getDefaultPropMetaForType("boolean")).toEqual({
      type: "boolean",
      control: "boolean",
      required: false,
    });
  });

  test("returns fallback meta for known special prop types", () => {
    expect(getDefaultPropMetaForType("asset")).toEqual({
      type: "string",
      control: "file",
      required: false,
    });
    expect(getDefaultPropMetaForType("page")).toEqual({
      type: "string",
      control: "url",
      required: false,
    });
    expect(getDefaultPropMetaForType("action")).toEqual({
      type: "action",
      control: "action",
      required: false,
    });
  });

  test("throws for prop types that require explicit metadata", () => {
    expect(() => getDefaultPropMetaForType("string[]")).toThrow(
      "must have a meta"
    );
    expect(() => getDefaultPropMetaForType("json")).toThrow("must have a meta");
    expect(() => getDefaultPropMetaForType("expression")).toThrow(
      "must have a meta"
    );
    expect(() => getDefaultPropMetaForType("parameter")).toThrow(
      "must have a meta"
    );
    expect(() => getDefaultPropMetaForType("resource")).toThrow(
      "must have a meta"
    );
  });
});

describe("getPropValueErrors", () => {
  test("skips non-expression props", () => {
    expect(
      getPropValueErrors({ type: "string", value: "invalid expression {" })
    ).toEqual([]);
  });

  test("validates expression props", () => {
    expect(getPropValueErrors({ type: "expression", value: "value" })).toEqual(
      []
    );
    expect(
      getPropValueErrors({ type: "expression", value: "invalid {" })
    ).not.toEqual([]);
  });
});

describe("getPropIdsToDelete", () => {
  const imageProps = new Map<Prop["name"], Prop>([
    ["src", prop("src")],
    ["width", prop("width")],
    ["height", prop("height")],
  ]);

  test("deletes related image dimensions with src", () => {
    expect(
      getPropIdsToDelete({
        instanceComponent: "Image",
        instanceProps: imageProps,
        propName: "src",
      })
    ).toEqual(new Set(["src-id", "width-id", "height-id"]));
  });

  test("deletes only the requested prop for non-image components", () => {
    expect(
      getPropIdsToDelete({
        instanceComponent: "Box",
        instanceProps: imageProps,
        propName: "src",
      })
    ).toEqual(new Set(["src-id"]));
  });
});

describe("getPropDeletePlan", () => {
  test("includes resource ids owned by deleted props", () => {
    expect(
      getPropDeletePlan({
        instance: image,
        props: [
          prop("src", {
            type: "resource",
            value: "resource-id",
          }),
          prop("width"),
          prop("height"),
        ],
        propName: "src",
      })
    ).toEqual({
      propIds: new Set(["src-id", "width-id", "height-id"]),
      resourceIds: new Set(["resource-id"]),
    });
  });
});

describe("createPropDeletePayload", () => {
  test("creates prop and resource removal payload", () => {
    expect(
      createPropDeletePayload({
        deletions: [{ instanceId: image.id, name: "src" }],
        instances: new Map([[image.id, image]]),
        props: [
          prop("src", {
            type: "resource",
            value: "resource-id",
          }),
          prop("width"),
          prop("height"),
        ],
      })
    ).toEqual({
      propIds: ["src-id", "width-id", "height-id"],
      resourceIds: ["resource-id"],
      payload: [
        {
          namespace: "props",
          patches: [
            { op: "remove", path: ["src-id"] },
            { op: "remove", path: ["width-id"] },
            { op: "remove", path: ["height-id"] },
          ],
        },
        {
          namespace: "resources",
          patches: [{ op: "remove", path: ["resource-id"] }],
        },
      ],
    });
  });

  test("reports the first missing instance", () => {
    expect(
      createPropDeletePayload({
        deletions: [{ instanceId: "missing", name: "src" }],
        instances: new Map([[image.id, image]]),
        props: [],
      })
    ).toEqual({
      missingInstanceId: "missing",
      propIds: [],
      resourceIds: [],
      payload: [],
    });
  });
});
