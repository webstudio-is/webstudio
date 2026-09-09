import { describe, expect, test } from "vitest";
import {
  blockComponent,
  blockBodyComponent,
  blockTemplateComponent,
  assignUniqueBlockTemplateNamesMutable,
  contentBlockSourceProp,
  type Instance,
} from "@webstudio-is/sdk";
import {
  canDeleteInstanceInContentMode,
  canMoveInstanceInContentMode,
  findBlockTemplateNameCollision,
  findBlockChildSelector,
  findBlockContentSelector,
  findBlockSelector,
  findBlockTemplates,
  getBlockTemplateInsertionIndex,
  getBlockTemplateNameConfirmation,
  resolveContentBlockSourceAssetId,
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
  test("resolves direct sources without expression values", () => {
    expect(
      resolveContentBlockSourceAssetId({
        source: { type: "asset", assetId: "post" },
      })
    ).toBe("post");
    expect(
      resolveContentBlockSourceAssetId({
        source: { type: "expression", value: "post" },
      })
    ).toBeUndefined();
    expect(
      resolveContentBlockSourceAssetId({
        source: { type: "expression", value: "post" },
        values: new Map([["post", "post-asset"]]),
      })
    ).toBe("post-asset");
  });

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

  test("rejects blocks with multiple Templates containers", () => {
    const instances = new Map<Instance["id"], Instance>([
      [
        "block",
        createInstance("block", blockComponent, [
          { type: "id", value: "templates-1" },
          { type: "id", value: "templates-2" },
        ]),
      ],
      [
        "templates-1",
        createInstance("templates-1", blockTemplateComponent, [
          { type: "id", value: "hero" },
        ]),
      ],
      [
        "templates-2",
        createInstance("templates-2", blockTemplateComponent, [
          { type: "id", value: "pricing" },
        ]),
      ],
      ["hero", createInstance("hero", "Box")],
      ["pricing", createInstance("pricing", "Box")],
    ]);

    expect(
      findBlockTemplates({ anchor: ["block"], instances })
    ).toBeUndefined();
  });

  test("does not expose templates without a Templates container", () => {
    const instances = new Map<Instance["id"], Instance>([
      ["block", createInstance("block", blockComponent)],
    ]);

    expect(
      findBlockTemplates({ anchor: ["block"], instances })
    ).toBeUndefined();
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

  test("uses an explicit Body as the editable content container", () => {
    const instances = new Map<Instance["id"], Instance>([
      ["page", createInstance("page", "Body")],
      [
        "block",
        createInstance("block", blockComponent, [
          { type: "id", value: "templates" },
          { type: "id", value: "header" },
          { type: "id", value: "content" },
        ]),
      ],
      ["templates", createInstance("templates", blockTemplateComponent)],
      ["header", createInstance("header", "Heading")],
      [
        "content",
        createInstance("content", blockBodyComponent, [
          { type: "id", value: "paragraph" },
        ]),
      ],
      ["paragraph", createInstance("paragraph", "Paragraph")],
    ]);

    expect(
      findBlockContentSelector({ anchor: ["block", "page"], instances })
    ).toEqual(["content", "block", "page"]);
    expect(
      findBlockContentSelector({
        anchor: ["paragraph", "content", "block", "page"],
        instances,
      })
    ).toEqual(["content", "block", "page"]);
    expect(
      findBlockContentSelector({
        anchor: ["header", "block", "page"],
        instances,
      })
    ).toBeUndefined();
    expect(
      findBlockChildSelector({
        instanceSelector: ["paragraph", "content", "block", "page"],
        instances,
      })
    ).toEqual(["paragraph", "content", "block", "page"]);
    expect(
      getBlockTemplateInsertionIndex({
        anchor: ["block", "page"],
        instances,
      })
    ).toBe(0);
    expect(
      getBlockTemplateInsertionIndex({
        anchor: ["paragraph", "content", "block", "page"],
        instances,
      })
    ).toBe(1);
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

  test("allows moving authored content but not templates in content mode", () => {
    const instances = new Map<Instance["id"], Instance>([
      ["body", createInstance("body", "Body")],
      ["block", createInstance("block", blockComponent)],
      ["authored", createInstance("authored", "Box")],
      ["nested", createInstance("nested", "Box")],
      ["templates", createInstance("templates", blockTemplateComponent)],
      ["template-child", createInstance("template-child", "Box")],
    ]);

    expect(
      canMoveInstanceInContentMode({
        instanceSelector: ["nested", "authored", "block", "body"],
        parentSelector: ["block", "body"],
        instances,
      })
    ).toBe(true);
    expect(
      canMoveInstanceInContentMode({
        instanceSelector: ["templates", "block", "body"],
        parentSelector: ["block", "body"],
        instances,
      })
    ).toBe(false);
    expect(
      canMoveInstanceInContentMode({
        instanceSelector: ["template-child", "templates", "block", "body"],
        parentSelector: ["block", "body"],
        instances,
      })
    ).toBe(false);
    expect(
      canMoveInstanceInContentMode({
        instanceSelector: ["authored", "block", "body"],
        parentSelector: ["templates", "block", "body"],
        instances,
      })
    ).toBe(false);
  });

  test("only allows content-mode mutations inside an explicit Body", () => {
    const instances = new Map<Instance["id"], Instance>([
      [
        "block",
        createInstance("block", blockComponent, [
          { type: "id", value: "header" },
          { type: "id", value: "content" },
        ]),
      ],
      ["header", createInstance("header", "Heading")],
      [
        "content",
        createInstance("content", blockBodyComponent, [
          { type: "id", value: "first" },
          { type: "id", value: "second" },
        ]),
      ],
      ["first", createInstance("first", "Paragraph")],
      ["second", createInstance("second", "Paragraph")],
    ]);

    expect(
      canDeleteInstanceInContentMode({
        instanceSelector: ["first", "content", "block"],
        instances,
      })
    ).toBe(true);
    expect(
      canDeleteInstanceInContentMode({
        instanceSelector: ["header", "block"],
        instances,
      })
    ).toBe(false);
    expect(
      canMoveInstanceInContentMode({
        instanceSelector: ["first", "content", "block"],
        parentSelector: ["content", "block"],
        instances,
      })
    ).toBe(true);
    expect(
      canMoveInstanceInContentMode({
        instanceSelector: ["header", "block"],
        parentSelector: ["content", "block"],
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
      [
        "hero",
        {
          ...createInstance("hero", "Box"),
          name: "HeroCard",
          label: "Hero Card",
        },
      ],
      ["card", createInstance("card", "Box")],
    ]);
  test("assigns unique names to newly inserted template entries", () => {
    const instances = createBlockInstances();
    instances.set("card-copy", createInstance("card-copy", "Box"));
    instances.set("card-copy-2", createInstance("card-copy-2", "Box"));
    instances.get("card-copy-2")!.name = "Box2";

    assignUniqueBlockTemplateNamesMutable({
      instanceIds: ["card-copy", "card-copy-2"],
      parent: instances.get("templates")!,
      instances,
    });

    expect(instances.get("card-copy")?.name).toBe("Box2");
    expect(instances.get("card-copy-2")?.name).toBe("Box3");
    expect(instances.get("hero")?.label).toBe("Hero Card");
  });

  test("finds exact name collisions in the same flat list", () => {
    const instances = createBlockInstances();

    expect(
      findBlockTemplateNameCollision({
        instance: instances.get("card")!,
        nextInstance: { ...instances.get("card")!, name: "HeroCard" },
        instances,
      })?.instance.id
    ).toBe("hero");
    expect(
      findBlockTemplateNameCollision({
        instance: instances.get("card")!,
        nextInstance: { ...instances.get("card")!, name: "heroCard" },
        instances,
      })
    ).toBeUndefined();
  });

  test.each([
    {
      source: {
        id: "src",
        instanceId: "block",
        name: contentBlockSourceProp,
        type: "asset" as const,
        value: "article.mdx",
      },
      label: "direct",
    },
    {
      source: {
        id: "src",
        instanceId: "block",
        name: contentBlockSourceProp,
        type: "expression" as const,
        value: "articleAssetId",
      },
      label: "dynamic",
    },
  ])("requires confirmation for a $label source", ({ source }) => {
    const instances = createBlockInstances();
    const instance = instances.get("card")!;
    const hero = instances.get("hero")!;

    expect(
      getBlockTemplateNameConfirmation({
        changes: [
          { instance, nextInstance: { ...instance, name: "ArticleCard" } },
          { instance: hero, nextInstance: { ...hero, name: "ArticleHero" } },
        ],
        instances,
        props: new Map([[source.id, source]]).values(),
      })
    ).toEqual({
      action: "rename",
      templates: [
        { instanceId: "card", oldName: "Box", newName: "ArticleCard" },
        {
          instanceId: "hero",
          oldName: "HeroCard",
          newName: "ArticleHero",
        },
      ],
    });
    expect(
      getBlockTemplateNameConfirmation({
        changes: [{ instance }],
        instances,
        props: [source],
      })
    ).toEqual({
      action: "delete",
      templates: [{ instanceId: "card", oldName: "Box" }],
    });
  });

  test("does not warn for nested, unchanged, or non-source templates", () => {
    const instances = createBlockInstances();
    const instance = instances.get("card")!;
    instances.set(
      "nested",
      createInstance("nested", "Box", [{ type: "id", value: "card" }])
    );
    instances.get("templates")!.children = [
      { type: "id", value: "hero" },
      { type: "id", value: "nested" },
    ];
    const source = {
      id: "src",
      instanceId: "block",
      name: contentBlockSourceProp,
      type: "asset" as const,
      value: "article.mdx",
    };

    expect(
      getBlockTemplateNameConfirmation({
        changes: [{ instance, nextInstance: { ...instance, label: "Card" } }],
        instances,
        props: [source],
      })
    ).toBeUndefined();
    instances.get("templates")!.children.push({ type: "id", value: "card" });
    expect(
      getBlockTemplateNameConfirmation({
        changes: [{ instance, nextInstance: { ...instance } }],
        instances,
        props: [source],
      })
    ).toBeUndefined();
    expect(
      getBlockTemplateNameConfirmation({
        changes: [
          { instance, nextInstance: { ...instance, label: "Article Card" } },
        ],
        instances,
        props: [],
      })
    ).toBeUndefined();
  });
});
