import { describe, expect, test } from "vitest";
import type { Instance, Prop } from "@webstudio-is/sdk";
import {
  clonePropForInstance,
  createPropDeletePayload,
  createPropBindingFromInput,
  createPropClonePatches,
  createPropRenamePayload,
  createPropUpsertPayload,
  createValidatedPropBindingFromInput,
  createValidatedPropValueFromInput,
  createPropValue,
  findProp,
  getPropDeletePlan,
  getPropIdsToDelete,
  getPropValueErrors,
  propBindingInput,
  propValueInput,
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

describe("findProp", () => {
  test("finds a prop by instance id and name", () => {
    expect(findProp([prop("src")], image.id, "src")?.id).toBe("src-id");
    expect(findProp([prop("src")], "other-id", "src")).toBeUndefined();
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
