import { describe, expect, test } from "vitest";
import {
  blockComponent,
  blockTemplateComponent,
  type Instance,
} from "@webstudio-is/sdk";
import {
  allocateUniqueBlockTemplateName,
  assignUniqueBlockTemplateNamesMutable,
  canDeleteInstanceInContentMode,
  findBlockTemplateNameCollision,
  findBlockTemplateOwner,
  findBlockChildSelector,
  findBlockSelector,
  findBlockTemplates,
  getBlockTemplateNameChangeImpact,
  getBlockTemplateInsertionIndex,
} from "./block";

const createInstance = (
  id: Instance["id"],
  component: Instance["component"],
  children: Instance["children"] = []
): Instance => ({
  type: "instance",
  id,
  component,
  children,
});

describe("block tree helpers", () => {
  test("finds block and block child selectors from nested anchors", () => {
    const instances = new Map<Instance["id"], Instance>([
      ["body", createInstance("body", "Body")],
      ["block", createInstance("block", blockComponent)],
      ["section", createInstance("section", "Box")],
    ]);

    expect(
      findBlockSelector({
        anchor: ["section", "block", "body"],
        instances,
      })
    ).toEqual(["block", "body"]);
    expect(
      findBlockChildSelector({
        instanceSelector: ["section", "block", "body"],
        instances,
      })
    ).toEqual(["section", "block", "body"]);
    expect(
      findBlockChildSelector({
        instanceSelector: ["block", "body"],
        instances,
      })
    ).toEqual(["block", "body"]);
  });

  test("finds template instances in a block", () => {
    const instances = new Map<Instance["id"], Instance>([
      [
        "block",
        createInstance("block", blockComponent, [
          { type: "id", value: "templates" },
        ]),
      ],
      [
        "templates",
        createInstance("templates", blockTemplateComponent, [
          { type: "id", value: "hero" },
          { type: "id", value: "pricing" },
        ]),
      ],
      ["hero", createInstance("hero", "Box")],
      ["pricing", createInstance("pricing", "Box")],
    ]);

    expect(findBlockTemplates({ anchor: ["block"], instances })).toEqual([
      [instances.get("hero"), ["hero", "templates", "block"]],
      [instances.get("pricing"), ["pricing", "templates", "block"]],
    ]);
  });

  test("finds block template insertion index", () => {
    const instances = new Map<Instance["id"], Instance>([
      [
        "block",
        createInstance("block", blockComponent, [
          { type: "id", value: "templates" },
          { type: "id", value: "hero" },
          { type: "id", value: "pricing" },
        ]),
      ],
      ["templates", createInstance("templates", blockTemplateComponent)],
      ["hero", createInstance("hero", "Box")],
      ["pricing", createInstance("pricing", "Box")],
    ]);

    expect(
      getBlockTemplateInsertionIndex({
        anchor: ["block"],
        instances,
      })
    ).toBe(1);
    expect(
      getBlockTemplateInsertionIndex({
        anchor: ["pricing", "block"],
        instances,
        insertBefore: true,
      })
    ).toBe(2);
    expect(
      getBlockTemplateInsertionIndex({
        anchor: ["pricing", "block"],
        instances,
      })
    ).toBe(3);
  });

  test("allows deleting direct content block children", () => {
    const instances = new Map<Instance["id"], Instance>([
      [
        "body",
        createInstance("body", "Body", [{ type: "id", value: "block" }]),
      ],
      [
        "block",
        createInstance("block", blockComponent, [
          { type: "id", value: "child" },
          { type: "id", value: "template" },
        ]),
      ],
      [
        "child",
        createInstance("child", "Box", [{ type: "id", value: "nested" }]),
      ],
      ["nested", createInstance("nested", "Box")],
      ["template", createInstance("template", blockTemplateComponent)],
    ]);

    expect(
      canDeleteInstanceInContentMode({
        instanceSelector: ["child", "block", "body"],
        instances,
      })
    ).toBe(true);
    expect(
      canDeleteInstanceInContentMode({
        instanceSelector: ["block", "body"],
        instances,
      })
    ).toBe(false);
    expect(
      canDeleteInstanceInContentMode({
        instanceSelector: ["nested", "child", "block", "body"],
        instances,
      })
    ).toBe(false);
    expect(
      canDeleteInstanceInContentMode({
        instanceSelector: ["template", "block", "body"],
        instances,
      })
    ).toBe(false);
  });
});

describe("block template names", () => {
  const createBlockInstances = () =>
    new Map<Instance["id"], Instance>([
      [
        "block",
        createInstance("block", blockComponent, [
          { type: "id", value: "templates" },
        ]),
      ],
      [
        "templates",
        createInstance("templates", blockTemplateComponent, [
          { type: "id", value: "hero" },
          { type: "id", value: "card" },
        ]),
      ],
      ["hero", { ...createInstance("hero", "Box"), label: "Hero Card" }],
      ["card", createInstance("card", "Box")],
    ]);
  test("finds only direct template entries and their owning block", () => {
    const instances = createBlockInstances();
    instances.set("nested", createInstance("nested", "Box"));
    instances.get("hero")?.children.push({ type: "id", value: "nested" });

    expect(
      findBlockTemplateOwner({ templateInstanceId: "hero", instances })
    ).toEqual({
      blockInstanceId: "block",
      templateContainerId: "templates",
    });
    expect(
      findBlockTemplateOwner({ templateInstanceId: "nested", instances })
    ).toBeUndefined();
  });

  test("allocates readable numeric suffixes", () => {
    const existingNames = new Set(["Card", "Card 2", "Card 4"]);

    expect(
      allocateUniqueBlockTemplateName({ name: "Card", existingNames })
    ).toBe("Card 3");
    expect(
      allocateUniqueBlockTemplateName({ name: "Card 2", existingNames })
    ).toBe("Card 3");
    expect(
      allocateUniqueBlockTemplateName({ name: "card", existingNames })
    ).toBe("card");
  });

  test("assigns unique names to newly inserted template entries", () => {
    const instances = createBlockInstances();
    instances.set("card-copy", createInstance("card-copy", "Box"));
    instances.set("card-copy-2", createInstance("card-copy-2", "Box"));

    assignUniqueBlockTemplateNamesMutable({
      newChildren: [
        { type: "id", value: "card-copy" },
        { type: "id", value: "card-copy-2" },
      ],
      existingChildren: [
        { type: "id", value: "hero" },
        { type: "id", value: "card" },
      ],
      instances,
    });

    expect(instances.get("card-copy")?.label).toBe("Box 2");
    expect(instances.get("card-copy-2")?.label).toBe("Box 3");
  });

  test("finds exact name collisions in the same flat list", () => {
    const instances = createBlockInstances();

    expect(
      findBlockTemplateNameCollision({
        instance: instances.get("card")!,
        nextInstance: { ...instances.get("card")!, label: "Hero Card" },
        instances,
      })?.instance.id
    ).toBe("hero");
    expect(
      findBlockTemplateNameCollision({
        instance: instances.get("card")!,
        nextInstance: { ...instances.get("card")!, label: "hero card" },
        instances,
      })
    ).toBeUndefined();
  });

  test("reports whether a name change needs source confirmation", () => {
    const instances = createBlockInstances();
    expect(
      getBlockTemplateNameChangeImpact({
        templateInstanceId: "hero",
        nextLabel: "Feature Card",
        externalContent: {
          blockInstanceId: "block",
          assetId: "post-asset",
          revision: "revision-1",
          contentRef: "posts/hello.mdx",
          format: "mdx",
          renderScope: "route:/posts/hello",
        },
        instances,
      })
    ).toMatchObject({
      blockInstanceId: "block",
      previousName: "Hero Card",
      nextName: "Feature Card",
      requiresConfirmation: true,
    });
  });
});
