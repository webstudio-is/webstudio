import { describe, expect, test } from "vitest";
import { serializeMdxDocument } from "@webstudio-is/content-engine/mdx";
import {
  type Asset,
  blockComponent,
  blockTemplateComponent,
  elementComponent,
  type ContentBlockExternalContentIdentity,
  type WebstudioData,
} from "@webstudio-is/sdk";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import {
  rebaseMdxAuthoredContent,
  serializeMdxAuthoredContent,
  serializeMdxTemplateInsertion,
} from "./mdx-authored-content";
import { extractWebstudioFragment } from "./fragment";
import { materializeMdxSource } from "./mdx-source";
import { InvalidMdxTemplateStructureError } from "./mdx-template-resolution";

const identity: ContentBlockExternalContentIdentity = {
  blockInstanceId: "block",
  assetId: "article",
  revision: "sha256:revision",
  contentRef: "article.mdx",
  format: "mdx",
  renderScope: "page",
};

const data: Omit<WebstudioData, "pages"> = {
  instances: new Map([
    [
      "block",
      {
        type: "instance",
        id: "block",
        component: blockComponent,
        children: [{ type: "id", value: "templates" }],
      },
    ],
    [
      "templates",
      {
        type: "instance",
        id: "templates",
        component: blockTemplateComponent,
        children: [],
      },
    ],
  ]),
  props: new Map(),
  dataSources: new Map(),
  resources: new Map(),
  styleSources: new Map(),
  styleSourceSelections: new Map(),
  styles: new Map(),
  breakpoints: new Map(),
  assets: new Map(),
};

const createSourceData = () => structuredClone(data);

const addCardTemplate = (sourceData: Omit<WebstudioData, "pages">) => {
  sourceData.instances.set("card", {
    type: "instance",
    id: "card",
    component: elementComponent,
    tag: "section",
    label: "Card",
    children: [{ type: "id", value: "default-content" }],
  });
  sourceData.instances.set("default-content", {
    type: "instance",
    id: "default-content",
    component: elementComponent,
    tag: "p",
    children: [{ type: "text", value: "Template default" }],
  });
  sourceData.instances.get("templates")?.children.push({
    type: "id",
    value: "card",
  });
};

const createAssetSourceData = () => {
  const sourceData = createSourceData();
  sourceData.assetFolders = new Map();
  sourceData.assets = new Map<string, Asset>([
    [
      "article",
      {
        id: "article",
        projectId: "project",
        type: "file",
        format: "mdx",
        name: "article_hash.mdx",
        filename: "article",
        size: 0,
        createdAt: "2026-01-01T00:00:00.000Z",
        description: null,
        meta: {},
      },
    ],
    [
      "hero",
      {
        id: "hero",
        projectId: "project",
        type: "image",
        format: "png",
        name: "hero_hash.png",
        filename: "hero",
        size: 0,
        createdAt: "2026-01-01T00:00:00.000Z",
        description: "Mountain sunrise",
        meta: { width: 1600, height: 900 },
      },
    ],
  ]);
  return sourceData;
};

describe("materializeMdxSource", () => {
  test.each([
    ["without", 0],
    ["with multiple", 2],
  ])("rejects a Content Block %s Templates containers", async (_, count) => {
    const sourceData = createSourceData();
    const block = sourceData.instances.get("block");
    if (block === undefined) {
      throw new Error("Expected Content Block");
    }
    if (count === 0) {
      block.children = [];
      sourceData.instances.delete("templates");
    } else {
      block.children.push({ type: "id", value: "templates-2" });
      sourceData.instances.set("templates-2", {
        type: "instance",
        id: "templates-2",
        component: blockTemplateComponent,
        children: [],
      });
    }

    await expect(
      materializeMdxSource({
        source: "# Heading\n",
        identity,
        data: sourceData,
        metas: componentMetas,
        projectId: "project",
      })
    ).rejects.toBeInstanceOf(InvalidMdxTemplateStructureError);
  });

  test("materializes and preserves component-style JSX template syntax", async () => {
    const sourceData = createSourceData();
    sourceData.instances.set("card", {
      type: "instance",
      id: "card",
      component: elementComponent,
      tag: "section",
      label: "Card",
      children: [],
    });
    sourceData.instances.get("templates")?.children.push({
      type: "id",
      value: "card",
    });

    const result = await materializeMdxSource({
      source: "<Card>Content</Card>\n",
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    expect(result.root.fragment.instances).toEqual([
      expect.objectContaining({
        tag: "section",
        children: [{ type: "text", value: "Content" }],
      }),
    ]);
    await expect(
      serializeMdxAuthoredContent({
        root: result.root,
        fragment: result.root.fragment,
      })
    ).resolves.toBe("<Card>Content</Card>\n");
  });

  test("keeps a semantic custom template with a reserved component name addressable after an edit", async () => {
    const sourceData = createSourceData();
    sourceData.instances.set("heading", {
      type: "instance",
      id: "heading",
      component: elementComponent,
      tag: "h1",
      label: "Image",
      children: [],
    });
    sourceData.instances.get("templates")?.children.push({
      type: "id",
      value: "heading",
    });
    const result = await materializeMdxSource({
      source: "# Hello\n",
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    const fragment = structuredClone(result.root.fragment);
    const heading = fragment.instances.find(({ tag }) => tag === "h1");
    if (heading === undefined) {
      throw new Error("Expected heading");
    }
    fragment.props.push({
      id: "heading-title",
      instanceId: heading.id,
      name: "title",
      type: "string",
      value: "Greeting",
    });

    const source = await serializeMdxAuthoredContent({
      root: result.root,
      fragment,
    });
    expect(source).toBe(
      '<ws.element ws:name="Image" title="Greeting">Hello</ws.element>\n'
    );

    const reloaded = await materializeMdxSource({
      source,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    expect(reloaded.diagnostics).toEqual([]);
    expect(reloaded.root.fragment.instances).toEqual([
      expect.objectContaining({ tag: "h1" }),
    ]);
  });

  test("replaces custom template defaults with explicit JSX children", async () => {
    const sourceData = createSourceData();
    addCardTemplate(sourceData);
    const source = `<Card>
  ## Launch offer
</Card>
`;

    const result = await materializeMdxSource({
      source,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    const card = result.root.fragment.instances.find(
      (instance) => instance.tag === "section"
    );
    const heading = result.root.fragment.instances.find(
      (instance) => instance.tag === "h2"
    );
    if (card === undefined || heading === undefined) {
      throw new Error("Expected Card and authored heading instances");
    }

    expect(card.children).toEqual([{ type: "id", value: heading.id }]);
    expect(heading.children).toEqual([{ type: "text", value: "Launch offer" }]);
    expect(
      result.root.fragment.instances.some(
        (instance) => instance.id === "default-content"
      )
    ).toBe(false);
    await expect(
      serializeMdxAuthoredContent({
        root: result.root,
        fragment: result.root.fragment,
      })
    ).resolves.toBe(source);
  });

  test("keeps custom template defaults for self-closing JSX", async () => {
    const sourceData = createSourceData();
    addCardTemplate(sourceData);

    const result = await materializeMdxSource({
      source: "<Card />\n",
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    const card = result.root.fragment.instances.find(
      (instance) => instance.tag === "section"
    );
    const defaultContent = result.root.fragment.instances.find(
      (instance) => instance.tag === "p"
    );
    if (card === undefined || defaultContent === undefined) {
      throw new Error("Expected Card template default instances");
    }

    expect(card.children).toEqual([{ type: "id", value: defaultContent.id }]);
    expect(defaultContent.children).toEqual([
      { type: "text", value: "Template default" },
    ]);
    await expect(
      serializeMdxAuthoredContent({
        root: result.root,
        fragment: result.root.fragment,
      })
    ).resolves.toBe("<Card />\n");
  });

  test("treats paired empty JSX as an explicit empty child override", async () => {
    const sourceData = createSourceData();
    addCardTemplate(sourceData);

    const result = await materializeMdxSource({
      source: "<Card></Card>\n",
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    const card = result.root.fragment.instances.find(
      (instance) => instance.tag === "section"
    );

    expect(card?.children).toEqual([]);
    expect(
      result.root.fragment.instances.some((instance) => instance.tag === "p")
    ).toBe(false);
    const serialized = await serializeMdxAuthoredContent({
      root: result.root,
      fragment: result.root.fragment,
    });
    const reparsed = await materializeMdxSource({
      source: serialized,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    expect(serialized).toContain("<Card>");
    expect(serialized).not.toContain("<Card />");
    expect(
      reparsed.root.fragment.instances.find(
        (instance) => instance.tag === "section"
      )?.children
    ).toEqual([]);
  });

  test("persists edits to inherited descendants as explicit JSX children", async () => {
    const sourceData = createSourceData();
    addCardTemplate(sourceData);
    sourceData.styleSources.set("paragraph-style", {
      type: "local",
      id: "paragraph-style",
    });
    sourceData.styleSourceSelections.set("default-content", {
      instanceId: "default-content",
      values: ["paragraph-style"],
    });
    const result = await materializeMdxSource({
      source: "<Card />\n",
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    const edited = structuredClone(result.root.fragment);
    const paragraph = edited.instances.find((instance) => instance.tag === "p");
    if (paragraph === undefined) {
      throw new Error("Expected inherited paragraph");
    }
    paragraph.children = [{ type: "text", value: "Edited content" }];

    const source = serializeMdxDocument(
      await rebaseMdxAuthoredContent({
        root: result.root,
        fragment: edited,
        latest: result.root.document,
      })
    );
    const reloaded = await materializeMdxSource({
      source,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });

    expect(source).toContain("<Card>");
    expect(source).not.toContain("<Card />");
    expect(
      reloaded.root.fragment.instances.find((instance) => instance.tag === "p")
        ?.children
    ).toEqual([{ type: "text", value: "Edited content" }]);
    const reloadedParagraph = reloaded.root.fragment.instances.find(
      ({ tag }) => tag === "p"
    );
    expect(reloaded.root.fragment.styleSourceSelections).toContainEqual({
      instanceId: reloadedParagraph?.id,
      values: [expect.stringMatching(/^mdx-/)],
    });

    const editedAgain = structuredClone(reloaded.root.fragment);
    const paragraphAgain = editedAgain.instances.find(({ tag }) => tag === "p");
    if (paragraphAgain === undefined) {
      throw new Error("Expected overlaid paragraph");
    }
    paragraphAgain.children = [{ type: "text", value: "Edited again" }];
    const sourceAfterSecondEdit = await serializeMdxAuthoredContent({
      root: reloaded.root,
      fragment: editedAgain,
    });
    const reloadedAgain = await materializeMdxSource({
      source: sourceAfterSecondEdit,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    const finalParagraph = reloadedAgain.root.fragment.instances.find(
      ({ tag }) => tag === "p"
    );
    expect(finalParagraph?.children).toEqual([
      { type: "text", value: "Edited again" },
    ]);
    expect(reloadedAgain.root.fragment.styleSourceSelections).toContainEqual({
      instanceId: finalParagraph?.id,
      values: [expect.stringMatching(/^mdx-/)],
    });
  });

  test("persists tag edits to inherited element descendants", async () => {
    const sourceData = createSourceData();
    addCardTemplate(sourceData);
    const result = await materializeMdxSource({
      source: "<Card />\n",
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    const edited = structuredClone(result.root.fragment);
    const paragraph = edited.instances.find(({ tag }) => tag === "p");
    if (paragraph === undefined) {
      throw new Error("Expected inherited paragraph");
    }
    paragraph.tag = "h3";

    const source = await serializeMdxAuthoredContent({
      root: result.root,
      fragment: edited,
    });
    const reloaded = await materializeMdxSource({
      source,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });

    expect(source).toContain("### Template default");
    expect(
      reloaded.root.fragment.instances.find(({ tag }) => tag === "h3")
    ).toBeDefined();
  });

  test("preserves a component descendant while authoring inherited content", async () => {
    const sourceData = createSourceData();
    addCardTemplate(sourceData);
    const button = sourceData.instances.get("default-content");
    if (button === undefined) {
      throw new Error("Expected Card content");
    }
    sourceData.instances.set(button.id, {
      ...button,
      component: "Button",
      tag: undefined,
      children: [{ type: "text", value: "Template action" }],
    });
    sourceData.styleSources.set("button-style", {
      type: "local",
      id: "button-style",
    });
    sourceData.styleSourceSelections.set(button.id, {
      instanceId: button.id,
      values: ["button-style"],
    });

    const result = await materializeMdxSource({
      source: "<Card />\n",
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    const edited = structuredClone(result.root.fragment);
    const editedButton = edited.instances.find(
      ({ component }) => component === "Button"
    );
    if (editedButton === undefined) {
      throw new Error("Expected inherited Button");
    }
    editedButton.children = [{ type: "text", value: "Authored action" }];

    const source = await serializeMdxAuthoredContent({
      root: result.root,
      fragment: edited,
    });
    const reloaded = await materializeMdxSource({
      source,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    const reloadedButton = reloaded.root.fragment.instances.find(
      ({ component }) => component === "Button"
    );

    expect(source).toContain("<Card>");
    expect(source).toContain(
      '<ws.element ws:tag="button">Authored action</ws.element>'
    );
    expect(reloadedButton?.children).toEqual([
      { type: "text", value: "Authored action" },
    ]);
    expect(reloaded.root.fragment.styleSourceSelections).toContainEqual({
      instanceId: reloadedButton?.id,
      values: [expect.stringMatching(/^mdx-/)],
    });
  });

  test("preserves a composite template edit made before its first save", async () => {
    const sourceData = createSourceData();
    addCardTemplate(sourceData);
    sourceData.styleSources.set("paragraph-style", {
      type: "local",
      id: "paragraph-style",
    });
    sourceData.styleSourceSelections.set("default-content", {
      instanceId: "default-content",
      values: ["paragraph-style"],
    });
    const pristineFragment = extractWebstudioFragment(sourceData, "card");
    const edited = structuredClone(pristineFragment);
    const paragraph = edited.instances.find(
      ({ id }) => id === "default-content"
    );
    if (paragraph === undefined) {
      throw new Error("Expected inserted Card content");
    }
    paragraph.children = [{ type: "text", value: "Immediate edit" }];
    const empty = await materializeMdxSource({
      source: "",
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });

    const source = serializeMdxDocument(
      await rebaseMdxAuthoredContent({
        root: empty.root,
        fragment: edited,
        latest: empty.root.document,
        insertedTemplates: new Map([
          ["card", { templateName: "Card", pristineFragment }],
        ]),
      })
    );
    const reloaded = await materializeMdxSource({
      source,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    const reloadedParagraph = reloaded.root.fragment.instances.find(
      ({ tag }) => tag === "p"
    );

    expect(source).toContain("<Card>");
    expect(source).toContain("Immediate edit");
    expect(reloadedParagraph?.children).toEqual([
      { type: "text", value: "Immediate edit" },
    ]);
    expect(reloaded.root.fragment.styleSourceSelections).toContainEqual({
      instanceId: reloadedParagraph?.id,
      values: [expect.stringMatching(/^mdx-/)],
    });
  });

  test("preserves default Image Assets during an unrelated first-save edit", async () => {
    const sourceData = createAssetSourceData();
    addCardTemplate(sourceData);
    const card = sourceData.instances.get("card");
    if (card === undefined) {
      throw new Error("Expected Card template");
    }
    sourceData.instances.set("default-image", {
      type: "instance",
      id: "default-image",
      component: "Image",
      children: [],
    });
    card.children.push({ type: "id", value: "default-image" });
    for (const name of ["src", "width", "height", "alt"] as const) {
      sourceData.props.set(`default-image-${name}`, {
        id: `default-image-${name}`,
        instanceId: "default-image",
        name,
        type: "asset",
        value: "hero",
      });
    }
    const pristineFragment = extractWebstudioFragment(sourceData, "card");
    const edited = structuredClone(pristineFragment);
    const paragraph = edited.instances.find(
      ({ id }) => id === "default-content"
    );
    if (paragraph === undefined) {
      throw new Error("Expected inserted Card content");
    }
    paragraph.children = [{ type: "text", value: "Immediate edit" }];
    const empty = await materializeMdxSource({
      source: "",
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });

    const source = serializeMdxDocument(
      await rebaseMdxAuthoredContent({
        root: empty.root,
        fragment: edited,
        latest: empty.root.document,
        insertedTemplates: new Map([
          ["card", { templateName: "Card", pristineFragment }],
        ]),
      })
    );
    const reloaded = await materializeMdxSource({
      source,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    const image = reloaded.root.fragment.instances.find(
      ({ component }) => component === "Image"
    );

    expect(source).toContain("Immediate edit");
    expect(source).toContain("<Image />");
    expect(reloaded.root.fragment.props).toContainEqual(
      expect.objectContaining({
        instanceId: image?.id,
        name: "src",
        type: "asset",
        value: "hero",
      })
    );
  });

  test("keeps template defaults inherited after an immediate root prop edit", async () => {
    const sourceData = createSourceData();
    addCardTemplate(sourceData);
    const pristineFragment = extractWebstudioFragment(sourceData, "card");
    const edited = structuredClone(pristineFragment);
    edited.props.push({
      id: "card-title",
      instanceId: "card",
      name: "title",
      type: "string",
      value: "Edited title",
    });
    const empty = await materializeMdxSource({
      source: "",
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });

    const source = serializeMdxDocument(
      await rebaseMdxAuthoredContent({
        root: empty.root,
        fragment: edited,
        latest: empty.root.document,
        insertedTemplates: new Map([
          ["card", { templateName: "Card", pristineFragment }],
        ]),
      })
    );
    const defaultContent = sourceData.instances.get("default-content");
    if (defaultContent === undefined) {
      throw new Error("Expected Card default content");
    }
    defaultContent.children = [
      { type: "text", value: "Updated template default" },
    ];
    const reloaded = await materializeMdxSource({
      source,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });

    expect(source).toBe('<Card title="Edited title" />\n');
    expect(
      reloaded.root.fragment.instances.find(({ tag }) => tag === "p")?.children
    ).toEqual([{ type: "text", value: "Updated template default" }]);
  });

  test("treats a removed fresh-insertion root prop as inheriting the template default", async () => {
    const sourceData = createSourceData();
    addCardTemplate(sourceData);
    sourceData.props.set("card-title", {
      id: "card-title",
      instanceId: "card",
      name: "title",
      type: "string",
      value: "Template title",
    });
    const pristineFragment = extractWebstudioFragment(sourceData, "card");
    const edited = structuredClone(pristineFragment);
    edited.props = edited.props.filter(({ name }) => name !== "title");
    const empty = await materializeMdxSource({
      source: "",
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });

    const source = serializeMdxDocument(
      await rebaseMdxAuthoredContent({
        root: empty.root,
        fragment: edited,
        latest: empty.root.document,
        insertedTemplates: new Map([
          ["card", { templateName: "Card", pristineFragment }],
        ]),
      })
    );
    const templateTitle = sourceData.props.get("card-title");
    if (templateTitle?.type !== "string") {
      throw new Error("Expected Card title");
    }
    templateTitle.value = "Updated template title";
    const reloaded = await materializeMdxSource({
      source,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    const card = reloaded.root.fragment.instances.find(
      ({ tag }) => tag === "section"
    );

    expect(source).toBe("<Card />\n");
    expect(reloaded.root.fragment.props).toContainEqual(
      expect.objectContaining({
        instanceId: card?.id,
        name: "title",
        value: "Updated template title",
      })
    );
  });

  test("keeps authored descendant props and comments in a template overlay", async () => {
    const sourceData = createSourceData();
    addCardTemplate(sourceData);
    sourceData.props.set("default-title", {
      id: "default-title",
      instanceId: "default-content",
      name: "title",
      type: "string",
      value: "Template title",
    });
    sourceData.styleSources.set("paragraph-style", {
      type: "local",
      id: "paragraph-style",
    });
    sourceData.styleSourceSelections.set("default-content", {
      instanceId: "default-content",
      values: ["paragraph-style"],
    });
    const source = `<Card>
  <ws.element ws:tag="p" title="Authored title">A{/* note */}B</ws.element>
</Card>
`;
    const result = await materializeMdxSource({
      source,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });

    const serialized = await serializeMdxAuthoredContent({
      root: result.root,
      fragment: result.root.fragment,
    });
    const reloaded = await materializeMdxSource({
      source: serialized,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    const paragraph = reloaded.root.fragment.instances.find(
      ({ tag }) => tag === "p"
    );

    expect(serialized).toContain('title="Authored title"');
    expect(serialized).toContain("{/* note */}");
    expect(reloaded.root.fragment.props).toContainEqual(
      expect.objectContaining({
        instanceId: paragraph?.id,
        name: "title",
        value: "Authored title",
      })
    );
    expect(reloaded.root.fragment.styleSourceSelections).toContainEqual({
      instanceId: paragraph?.id,
      values: [expect.stringMatching(/^mdx-/)],
    });
    expect(paragraph?.children).toEqual([
      { type: "text", value: "A" },
      { type: "text", value: "B" },
    ]);
  });

  test.each([
    ["an authored override", ' title="Authored title"'],
    ["an inherited value", ""],
  ])(
    "resets %s on an overlaid descendant to the current template default",
    async (_, authoredTitle) => {
      const sourceData = createSourceData();
      addCardTemplate(sourceData);
      sourceData.props.set("default-title", {
        id: "default-title",
        instanceId: "default-content",
        name: "title",
        type: "string",
        value: "Template title",
      });
      const source = `<Card>
  <ws.element ws:tag="p"${authoredTitle}>Authored content</ws.element>
</Card>
`;
      const result = await materializeMdxSource({
        source,
        identity,
        data: sourceData,
        metas: componentMetas,
        projectId: "project",
      });
      const reset = structuredClone(result.root.fragment);
      reset.props = reset.props.filter(({ name }) => name !== "title");

      const serialized = await serializeMdxAuthoredContent({
        root: result.root,
        fragment: reset,
      });
      const templateTitle = sourceData.props.get("default-title");
      if (templateTitle === undefined || templateTitle.type !== "string") {
        throw new Error("Expected template title");
      }
      templateTitle.value = "Updated template title";
      const reloaded = await materializeMdxSource({
        source: serialized,
        identity,
        data: sourceData,
        metas: componentMetas,
        projectId: "project",
      });
      const paragraph = reloaded.root.fragment.instances.find(
        ({ tag }) => tag === "p"
      );

      expect(serialized).not.toContain("title=");
      expect(reloaded.root.fragment.props).toContainEqual(
        expect.objectContaining({
          instanceId: paragraph?.id,
          name: "title",
          value: "Updated template title",
        })
      );
    }
  );

  test("resets Markdown Image descendant props to current template defaults", async () => {
    const sourceData = createSourceData();
    addCardTemplate(sourceData);
    const paragraph = sourceData.instances.get("default-content");
    if (paragraph === undefined) {
      throw new Error("Expected Card default content");
    }
    paragraph.children = [{ type: "id", value: "default-image" }];
    sourceData.instances.set("default-image", {
      type: "instance",
      id: "default-image",
      component: "Image",
      children: [],
    });
    sourceData.props.set("default-image-src", {
      id: "default-image-src",
      instanceId: "default-image",
      name: "src",
      type: "string",
      value: "https://example.com/template.png",
    });
    sourceData.props.set("default-image-alt", {
      id: "default-image-alt",
      instanceId: "default-image",
      name: "alt",
      type: "string",
      value: "Template image",
    });
    const result = await materializeMdxSource({
      source: `<Card>
  ![Authored image](https://example.com/authored.png)
</Card>
`,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    const reset = structuredClone(result.root.fragment);
    const image = reset.instances.find(
      ({ component }) => component === "Image"
    );
    reset.props = reset.props.filter(
      ({ instanceId }) => instanceId !== image?.id
    );

    const source = await serializeMdxAuthoredContent({
      root: result.root,
      fragment: reset,
    });
    const defaultSource = sourceData.props.get("default-image-src");
    const defaultAlt = sourceData.props.get("default-image-alt");
    if (defaultSource?.type !== "string" || defaultAlt?.type !== "string") {
      throw new Error("Expected Image template defaults");
    }
    defaultSource.value = "https://example.com/updated.png";
    defaultAlt.value = "Updated template image";
    const reloaded = await materializeMdxSource({
      source,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    const reloadedImage = reloaded.root.fragment.instances.find(
      ({ component }) => component === "Image"
    );
    const reloadedImageProps = reloaded.root.fragment.props.filter(
      ({ instanceId }) => instanceId === reloadedImage?.id
    );

    expect(source).toContain("<Image />");
    expect(reloadedImageProps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "src",
          value: "https://example.com/updated.png",
        }),
        expect.objectContaining({
          name: "alt",
          value: "Updated template image",
        }),
      ])
    );
  });

  test("round-trips an authored Asset Image through a styled composite descendant", async () => {
    const sourceData = createAssetSourceData();
    addCardTemplate(sourceData);
    const image = sourceData.instances.get("default-content");
    if (image === undefined) {
      throw new Error("Expected Card default content");
    }
    sourceData.instances.set(image.id, {
      ...image,
      children: [{ type: "id", value: "default-link" }],
    });
    sourceData.instances.set("default-link", {
      type: "instance",
      id: "default-link",
      component: elementComponent,
      tag: "a",
      children: [{ type: "id", value: "default-image" }],
    });
    sourceData.instances.set("default-image", {
      type: "instance",
      id: "default-image",
      component: "Image",
      children: [],
    });
    sourceData.styleSources.set("image-style", {
      type: "local",
      id: "image-style",
    });
    sourceData.styleSourceSelections.set("default-image", {
      instanceId: "default-image",
      values: ["image-style"],
    });
    const source = `<Card>
  [![Mountain sunrise](./hero.png)](/gallery)
</Card>
`;
    const result = await materializeMdxSource({
      source,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    const edited = structuredClone(result.root.fragment);
    const authoredImage = edited.instances.find(
      ({ component }) => component === "Image"
    );
    if (authoredImage === undefined) {
      throw new Error("Expected overlaid Image");
    }
    edited.props.push({
      id: "image-class",
      instanceId: authoredImage.id,
      name: "class",
      type: "string",
      value: "featured",
    });

    const serialized = await serializeMdxAuthoredContent({
      root: result.root,
      fragment: edited,
    });
    const reloaded = await materializeMdxSource({
      source: serialized,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    const reloadedImage = reloaded.root.fragment.instances.find(
      ({ component }) => component === "Image"
    );

    expect(serialized).toContain(
      '<Image src="./hero.png" alt="Mountain sunrise" className="featured" />'
    );
    expect(serialized).not.toMatch(/(?:width|height)="\.\/hero\.png"/);
    expect(reloaded.root.fragment.styleSourceSelections).toContainEqual({
      instanceId: reloadedImage?.id,
      values: [expect.stringMatching(/^mdx-/)],
    });
    expect(
      reloaded.root.fragment.props.filter(
        ({ instanceId }) => instanceId === reloadedImage?.id
      )
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "src", type: "asset", value: "hero" }),
        expect.objectContaining({
          name: "width",
          type: "asset",
          value: "hero",
        }),
        expect.objectContaining({
          name: "height",
          type: "asset",
          value: "hero",
        }),
      ])
    );
  });

  test("applies nested component prop permissions inside a composite template", async () => {
    const sourceData = createSourceData();
    addCardTemplate(sourceData);
    const image = sourceData.instances.get("default-content");
    if (image === undefined) {
      throw new Error("Expected Card default content");
    }
    sourceData.instances.set(image.id, {
      ...image,
      component: "Image",
      tag: undefined,
      children: [],
    });
    sourceData.props.set("image-optimize", {
      id: "image-optimize",
      instanceId: image.id,
      name: "optimize",
      type: "boolean",
      value: true,
    });
    sourceData.props.set("image-quality", {
      id: "image-quality",
      instanceId: image.id,
      name: "quality",
      type: "number",
      value: 60,
    });
    const source = `<Card>
  <Image src="https://example.com/hero.png" alt="Hero" optimize="false" quality="80" />
</Card>
`;

    const result = await materializeMdxSource({
      source,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    const materializedImage = result.root.fragment.instances.find(
      ({ component }) => component === "Image"
    );
    const imageProps = result.root.fragment.props.filter(
      ({ instanceId }) => instanceId === materializedImage?.id
    );

    expect(imageProps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "optimize", value: true }),
        expect.objectContaining({ name: "quality", value: 60 }),
      ])
    );
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "ignored-template-prop",
          propName: "optimize",
          reason: "design-only",
        }),
        expect.objectContaining({
          code: "ignored-template-prop",
          propName: "quality",
          reason: "design-only",
        }),
      ])
    );
    await expect(
      serializeMdxAuthoredContent({
        root: result.root,
        fragment: result.root.fragment,
      })
    ).resolves.toBe(source);
  });

  test("discards diagnostics from a composite overlay that does not match", async () => {
    const sourceData = createSourceData();
    addCardTemplate(sourceData);
    const image = sourceData.instances.get("default-content");
    const card = sourceData.instances.get("card");
    if (image === undefined || card === undefined) {
      throw new Error("Expected Card template");
    }
    sourceData.instances.set(image.id, {
      ...image,
      component: "Image",
      tag: undefined,
      children: [],
    });
    sourceData.instances.set("default-copy", {
      type: "instance",
      id: "default-copy",
      component: elementComponent,
      tag: "p",
      children: [{ type: "text", value: "Template copy" }],
    });
    card.children.push({ type: "id", value: "default-copy" });
    const source = `<Card>
  <Image src="https://example.com/hero.png" alt="Hero" optimize="false" />
  ## Different shape
</Card>
`;

    const result = await materializeMdxSource({
      source,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });

    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: "ignored-template-prop",
        templateName: "Image",
        propName: "optimize",
        reason: "design-only",
      }),
    ]);
  });

  test("replaces CodeText template defaults with fenced code", async () => {
    const sourceData = createSourceData();
    sourceData.instances.set("code", {
      type: "instance",
      id: "code",
      component: "CodeText",
      label: "Code Block",
      children: [{ type: "text", value: "templateDefault()" }],
    });
    sourceData.instances.get("templates")?.children.push({
      type: "id",
      value: "code",
    });
    const source = "```js\nauthoredCode()\n```\n";

    const result = await materializeMdxSource({
      source,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    const code = result.root.fragment.instances.find(
      (instance) => instance.component === "CodeText"
    );
    if (code === undefined) {
      throw new Error("Expected CodeText template instance");
    }

    expect(code.children).toEqual([{ type: "text", value: "authoredCode()" }]);
    await expect(
      serializeMdxAuthoredContent({
        root: result.root,
        fragment: result.root.fragment,
      })
    ).resolves.toBe(source);
  });

  test.each([
    [
      "a semantic fence",
      "Code Block",
      "```javascript\nhello()\n```\n",
      [["language", "javascript"]],
    ],
    [
      "named JSX",
      "CodeText",
      '<CodeText language="javascript" theme="github-light">hello()</CodeText>\n',
      [
        ["language", "javascript"],
        ["theme", "dracula"],
      ],
    ],
  ] as const)(
    "preserves explicit CodeText global defaults from %s over template defaults",
    async (_, templateName, source, expectedProps) => {
      const sourceData = createSourceData();
      sourceData.instances.set("code", {
        type: "instance",
        id: "code",
        component: "CodeText",
        label: templateName,
        children: [{ type: "text", value: "templateDefault()" }],
      });
      sourceData.instances.get("templates")?.children.push({
        type: "id",
        value: "code",
      });
      sourceData.props.set("code-language", {
        id: "code-language",
        instanceId: "code",
        name: "language",
        type: "string",
        value: "python",
      });
      sourceData.props.set("code-theme", {
        id: "code-theme",
        instanceId: "code",
        name: "theme",
        type: "string",
        value: "dracula",
      });

      const result = await materializeMdxSource({
        source,
        identity,
        data: sourceData,
        metas: componentMetas,
        projectId: "project",
      });
      const serialized = await serializeMdxAuthoredContent({
        root: result.root,
        fragment: result.root.fragment,
      });
      const reloaded = await materializeMdxSource({
        source: serialized,
        identity,
        data: sourceData,
        metas: componentMetas,
        projectId: "project",
      });

      expect(serialized).toBe(source);
      expect(reloaded.root.fragment.props).toEqual(
        expect.arrayContaining(
          expectedProps.map(([name, value]) =>
            expect.objectContaining({ name, value })
          )
        )
      );
      if (templateName === "CodeText") {
        expect(result.diagnostics).toContainEqual(
          expect.objectContaining({
            code: "ignored-template-prop",
            propName: "theme",
            reason: "design-only",
          })
        );
      }
    }
  );

  test("round-trips styled semantic CodeText without duplicating content", async () => {
    const sourceData = createSourceData();
    sourceData.instances.set("code", {
      type: "instance",
      id: "code",
      component: "CodeText",
      label: "Code Block",
      children: [{ type: "text", value: "templateDefault()" }],
    });
    sourceData.instances.get("templates")?.children.push({
      type: "id",
      value: "code",
    });
    sourceData.styleSources.set("code-style", {
      type: "local",
      id: "code-style",
    });
    sourceData.styleSourceSelections.set("code", {
      instanceId: "code",
      values: ["code-style"],
    });
    sourceData.breakpoints.set("base", { id: "base", label: "Base" });
    sourceData.styles.set("code-style:base:color", {
      breakpointId: "base",
      styleSourceId: "code-style",
      property: "color",
      value: { type: "keyword", value: "red" },
    });
    const source = "```js\nauthoredCode()\n```\n";
    const result = await materializeMdxSource({
      source,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    const edited = structuredClone(result.root.fragment);
    const code = edited.instances.find(
      ({ component }) => component === "CodeText"
    );
    if (code === undefined) {
      throw new Error("Expected CodeText");
    }
    code.children = [{ type: "text", value: "changedCode()" }];

    await expect(
      serializeMdxAuthoredContent({
        root: result.root,
        fragment: result.root.fragment,
      })
    ).resolves.toBe(source);
    await expect(
      serializeMdxAuthoredContent({ root: result.root, fragment: edited })
    ).resolves.toBe("```js\nchangedCode()\n```\n");
  });

  test("keeps the CodeText template when an edit requires JSX", async () => {
    const sourceData = createSourceData();
    sourceData.instances.set("code", {
      type: "instance",
      id: "code",
      component: "CodeText",
      label: "Code Block",
      children: [],
    });
    sourceData.instances.get("templates")?.children.push({
      type: "id",
      value: "code",
    });
    const result = await materializeMdxSource({
      source: "```js\nauthoredCode()\n```\n",
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    const edited = structuredClone(result.root.fragment);
    const code = edited.instances.find(
      ({ component }) => component === "CodeText"
    );
    if (code === undefined) {
      throw new Error("Expected CodeText");
    }
    edited.props.push({
      id: "code-class",
      instanceId: code.id,
      name: "class",
      type: "string",
      value: "featured",
    });

    const source = await serializeMdxAuthoredContent({
      root: result.root,
      fragment: edited,
    });
    const reloaded = await materializeMdxSource({
      source,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });

    expect(source).toContain('ws:name="Code Block"');
    expect(source).toContain('className="featured"');
    expect(
      reloaded.root.fragment.instances.find(
        ({ component }) => component === "CodeText"
      )
    ).toBeDefined();
  });

  test("keeps named CodeText JSX instead of collapsing it to Markdown", async () => {
    const sourceData = createSourceData();
    sourceData.instances.set("code", {
      type: "instance",
      id: "code",
      component: "CodeText",
      label: "CodeText",
      children: [],
    });
    sourceData.instances.get("templates")?.children.push({
      type: "id",
      value: "code",
    });
    const source = "<CodeText>authoredCode()</CodeText>\n";

    const result = await materializeMdxSource({
      source,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });

    await expect(
      serializeMdxAuthoredContent({
        root: result.root,
        fragment: result.root.fragment,
      })
    ).resolves.toBe(source);
  });

  test("round-trips adapter JSX without requiring a matching template", async () => {
    const sourceData = createSourceData();
    const source = `<CodeText className="example">const ready = true;</CodeText>

Before <Image src="https://example.com/hero.png" alt="Hero" className="featured" /> after.
`;

    const result = await materializeMdxSource({
      source,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });

    expect(result.diagnostics).toEqual([]);
    expect(
      result.root.fragment.instances.map(({ component }) => component)
    ).toEqual(expect.arrayContaining(["CodeText", "Image"]));
    expect(result.root.fragment.props).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "class", value: "example" }),
        expect.objectContaining({ name: "class", value: "featured" }),
      ])
    );
    await expect(
      serializeMdxAuthoredContent({
        root: result.root,
        fragment: result.root.fragment,
      })
    ).resolves.toBe(source);

    const reloaded = await materializeMdxSource({
      source: await serializeMdxAuthoredContent({
        root: result.root,
        fragment: result.root.fragment,
      }),
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    expect(reloaded.diagnostics).toEqual([]);
    expect(
      reloaded.root.fragment.instances.map(({ component }) => component)
    ).toEqual(expect.arrayContaining(["CodeText", "Image"]));
  });

  test.each([false, true])(
    "resolves built-in JSX alias collisions with template=%s",
    async (withTemplate) => {
      const sourceData = createSourceData();
      if (withTemplate) {
        sourceData.instances.set("image-template", {
          type: "instance",
          id: "image-template",
          component: "Image",
          label: "Image",
          children: [],
        });
        sourceData.instances.get("templates")?.children.push({
          type: "id",
          value: "image-template",
        });
      }
      const source =
        '<Image class="legacy" className="canonical" alt="Example" />\n';

      const result = await materializeMdxSource({
        source,
        identity,
        data: sourceData,
        metas: componentMetas,
        projectId: "project",
      });
      const classProp = result.root.fragment.props.find(
        ({ name }) => name === "class"
      );

      expect(classProp).toMatchObject({ value: "canonical" });
      expect(result.diagnostics).toEqual([
        expect.objectContaining({
          code: "ignored-template-prop",
          templateName: "Image",
          propName: "class",
          reason: "incompatible",
          sourceRange: {
            start: { line: 1, column: 8, offset: 7 },
            end: { line: 1, column: 22, offset: 21 },
          },
        }),
      ]);
      expect(
        await serializeMdxAuthoredContent({
          root: result.root,
          fragment: result.root.fragment,
        })
      ).toBe(source);

      const withoutClass = structuredClone(result.root.fragment);
      withoutClass.props = withoutClass.props.filter(
        ({ id }) => id !== classProp?.id
      );
      expect(
        await serializeMdxAuthoredContent({
          root: result.root,
          fragment: withoutClass,
        })
      ).toBe('<Image alt="Example" />\n');

      if (classProp?.type !== "string") {
        throw new Error("Expected Image class prop");
      }
      classProp.value = "changed";
      expect(
        await serializeMdxAuthoredContent({
          root: result.root,
          fragment: result.root.fragment,
        })
      ).toBe('<Image class="legacy" className="changed" alt="Example" />\n');
    }
  );

  test("applies component prop permissions to adapter JSX without a template", async () => {
    const sourceData = createSourceData();
    const source =
      '<Image src="https://example.com/hero.png" alt="Hero" optimize="false" quality="80" />\n';

    const result = await materializeMdxSource({
      source,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    const image = result.root.fragment.instances.find(
      ({ component }) => component === "Image"
    );
    const propNames = result.root.fragment.props.flatMap((prop) =>
      prop.instanceId === image?.id ? [prop.name] : []
    );

    expect(propNames).toEqual(expect.arrayContaining(["src", "alt"]));
    expect(propNames).not.toEqual(
      expect.arrayContaining(["optimize", "quality"])
    );
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "ignored-template-prop",
          templateName: "Image",
          propName: "optimize",
          reason: "design-only",
        }),
        expect.objectContaining({
          code: "ignored-template-prop",
          templateName: "Image",
          propName: "quality",
          reason: "design-only",
        }),
      ])
    );
    await expect(
      serializeMdxAuthoredContent({
        root: result.root,
        fragment: result.root.fragment,
      })
    ).resolves.toBe(source);
  });

  test("applies a semantic template added after adapter JSX was authored", async () => {
    const sourceData = createSourceData();
    const source = '<CodeText className="example">authoredCode()</CodeText>\n';
    const untemplated = await materializeMdxSource({
      source,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    expect(untemplated.diagnostics).toEqual([]);

    sourceData.instances.set("code", {
      type: "instance",
      id: "code",
      component: "CodeText",
      label: "Code Block",
      children: [{ type: "text", value: "templateDefault()" }],
    });
    sourceData.instances.get("templates")?.children.push({
      type: "id",
      value: "code",
    });
    sourceData.styleSources.set("code-style", {
      type: "local",
      id: "code-style",
    });
    sourceData.styleSourceSelections.set("code", {
      instanceId: "code",
      values: ["code-style"],
    });

    const templated = await materializeMdxSource({
      source,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    const code = templated.root.fragment.instances.find(
      ({ component }) => component === "CodeText"
    );

    expect(code?.children).toEqual([{ type: "text", value: "authoredCode()" }]);
    expect(templated.root.fragment.styleSourceSelections).toContainEqual({
      instanceId: code?.id,
      values: [expect.stringMatching(/^mdx-/)],
    });
    await expect(
      serializeMdxAuthoredContent({
        root: templated.root,
        fragment: templated.root.fragment,
      })
    ).resolves.toBe(source);
  });

  test("materializes Markdown through a matching template and serializes it as Markdown", async () => {
    const sourceData: Omit<WebstudioData, "pages"> = {
      ...createSourceData(),
      styleSources: new Map([
        ["heading-style", { type: "local", id: "heading-style" }],
      ]),
      styleSourceSelections: new Map([
        ["heading", { instanceId: "heading", values: ["heading-style"] }],
      ]),
      styles: new Map([
        [
          "heading-style:base:color",
          {
            breakpointId: "base",
            styleSourceId: "heading-style",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
        ],
      ]),
      props: new Map([
        [
          "heading-title",
          {
            id: "heading-title",
            instanceId: "heading",
            name: "title",
            type: "string",
            value: "Inherited template title",
          },
        ],
      ]),
    };
    sourceData.instances.set("heading", {
      type: "instance",
      id: "heading",
      component: elementComponent,
      tag: "h1",
      label: "Heading 1",
      children: [{ type: "id", value: "template-mark" }],
    });
    sourceData.instances.set("template-mark", {
      type: "instance",
      id: "template-mark",
      component: elementComponent,
      tag: "span",
      children: [{ type: "text", value: "Template text" }],
    });
    sourceData.instances.get("templates")?.children.push({
      type: "id",
      value: "heading",
    });

    const result = await materializeMdxSource({
      source: "# Existing heading\n",
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });

    expect(result.root.fragment.instances).toEqual([
      expect.objectContaining({
        component: elementComponent,
        tag: "h1",
        children: [{ type: "text", value: "Existing heading" }],
      }),
    ]);
    expect(result.root.fragment.styleSourceSelections).toHaveLength(1);
    await expect(
      serializeMdxAuthoredContent({
        root: result.root,
        fragment: result.root.fragment,
      })
    ).resolves.toBe("# Existing heading\n");
  });

  test("keeps the selected template identity when semantic candidates duplicate", async () => {
    const sourceData = createSourceData();
    for (const [id, label] of [
      ["primary-heading", "Primary heading"],
      ["secondary-heading", "Secondary heading"],
    ] as const) {
      sourceData.instances.set(id, {
        type: "instance",
        id,
        component: elementComponent,
        tag: "h1",
        label,
        children: [],
      });
      sourceData.instances.get("templates")?.children.push({
        type: "id",
        value: id,
      });
    }
    sourceData.styleSources.set("primary-style", {
      type: "local",
      id: "primary-style",
    });
    sourceData.styleSourceSelections.set("primary-heading", {
      instanceId: "primary-heading",
      values: ["primary-style"],
    });
    const document = await serializeMdxTemplateInsertion({
      identity,
      templateName: "Primary heading",
      fragment: {
        children: [{ type: "id", value: "inserted-heading" }],
        instances: [
          {
            type: "instance",
            id: "inserted-heading",
            component: elementComponent,
            tag: "h1",
            children: [{ type: "text", value: "Selected" }],
          },
        ],
        props: [],
        assets: [],
        dataSources: [],
        resources: [],
        breakpoints: [],
        styleSourceSelections: [],
        styleSources: [],
        styles: [],
      },
    });
    const source = serializeMdxDocument(document);
    const result = await materializeMdxSource({
      source,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    const heading = result.root.fragment.instances.find(
      (instance) => instance.tag === "h1"
    );

    expect(source).toContain('ws:name="Primary heading"');
    expect(result.diagnostics).toEqual([]);
    expect(result.root.fragment.styleSourceSelections).toContainEqual({
      instanceId: heading?.id,
      values: [expect.stringMatching(/^mdx-/)],
    });

    const savedSource = await serializeMdxAuthoredContent({
      root: result.root,
      fragment: result.root.fragment,
    });
    const reloaded = await materializeMdxSource({
      source: savedSource,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    const reloadedHeading = reloaded.root.fragment.instances.find(
      (instance) => instance.tag === "h1"
    );
    expect(savedSource).toBe(source);
    expect(reloaded.root.fragment.styleSourceSelections).toContainEqual({
      instanceId: reloadedHeading?.id,
      values: [expect.stringMatching(/^mdx-/)],
    });

    for (const [instanceId, value] of [
      ["primary-heading", "Primary updated"],
      ["secondary-heading", "Secondary updated"],
    ] as const) {
      sourceData.props.set(`${instanceId}-title`, {
        id: `${instanceId}-title`,
        instanceId,
        name: "title",
        type: "string",
        value,
      });
    }
    const rematerialized = await materializeMdxSource({
      source: savedSource,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    const rematerializedHeading = rematerialized.root.fragment.instances.find(
      (instance) => instance.tag === "h1"
    );
    expect(rematerialized.root.fragment.props).toContainEqual(
      expect.objectContaining({
        instanceId: rematerializedHeading?.id,
        name: "title",
        value: "Primary updated",
      })
    );
  });

  test("keeps new semantic-template props by switching to explicit MDX", async () => {
    const sourceData = createSourceData();
    sourceData.instances.set("heading", {
      type: "instance",
      id: "heading",
      component: elementComponent,
      tag: "h1",
      label: "Heading 1",
      children: [],
    });
    sourceData.instances.get("templates")?.children.push({
      type: "id",
      value: "heading",
    });
    sourceData.styleSources.set("heading-style", {
      type: "local",
      id: "heading-style",
    });
    sourceData.styleSourceSelections.set("heading", {
      instanceId: "heading",
      values: ["heading-style"],
    });
    const result = await materializeMdxSource({
      source: "# Existing heading\n",
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    const edited = structuredClone(result.root.fragment);
    const heading = edited.instances.find((instance) => instance.tag === "h1");
    if (heading === undefined) {
      throw new Error("Expected heading");
    }
    edited.props.push({
      id: "authored-title",
      instanceId: heading.id,
      name: "title",
      type: "string",
      value: "Authored title",
    });

    const source = await serializeMdxAuthoredContent({
      root: result.root,
      fragment: edited,
    });
    sourceData.instances.set("other-heading", {
      type: "instance",
      id: "other-heading",
      component: elementComponent,
      tag: "h1",
      label: "Other heading",
      children: [],
    });
    sourceData.instances.get("templates")?.children.push({
      type: "id",
      value: "other-heading",
    });
    const reloaded = await materializeMdxSource({
      source,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });

    expect(source).toContain('ws:name="Heading 1"');
    expect(source).toContain('title="Authored title"');
    expect(reloaded.diagnostics).toEqual([]);
    const reloadedHeading = reloaded.root.fragment.instances.find(
      ({ tag }) => tag === "h1"
    );
    expect(reloaded.root.fragment.styleSourceSelections).toContainEqual({
      instanceId: reloadedHeading?.id,
      values: [expect.stringMatching(/^mdx-/)],
    });
    expect(reloaded.root.fragment.props).toContainEqual(
      expect.objectContaining({ name: "title", value: "Authored title" })
    );

    const changed = structuredClone(reloaded.root.fragment);
    const changedTitle = changed.props.find(({ name }) => name === "title");
    if (changedTitle?.type !== "string") {
      throw new Error("Expected authored heading title");
    }
    changedTitle.value = "Updated title";
    const changedSource = await serializeMdxAuthoredContent({
      root: reloaded.root,
      fragment: changed,
    });
    expect(changedSource).toContain('ws:name="Heading 1"');
    expect(changedSource).toContain('title="Updated title"');

    const changedReloaded = await materializeMdxSource({
      source: changedSource,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    const removed = structuredClone(changedReloaded.root.fragment);
    removed.props = removed.props.filter(({ name }) => name !== "title");
    const removedSource = await serializeMdxAuthoredContent({
      root: changedReloaded.root,
      fragment: removed,
    });
    expect(removedSource).toContain('ws:name="Heading 1"');
    expect(removedSource).not.toContain("title=");
    const removedReloaded = await materializeMdxSource({
      source: removedSource,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    expect(
      removedReloaded.root.fragment.props.some(({ name }) => name === "title")
    ).toBe(false);
  });

  test("uses styled Image templates for nested Markdown images", async () => {
    const sourceData = createAssetSourceData();
    sourceData.instances.set("image-template", {
      type: "instance",
      id: "image-template",
      component: "Image",
      label: "Image",
      children: [],
    });
    sourceData.instances.get("templates")?.children.push({
      type: "id",
      value: "image-template",
    });
    sourceData.styleSources.set("image-style", {
      type: "local",
      id: "image-style",
    });
    sourceData.styleSourceSelections.set("image-template", {
      instanceId: "image-template",
      values: ["image-style"],
    });
    sourceData.breakpoints.set("base", { id: "base", label: "Base" });
    sourceData.styles.set("image-style:base:width", {
      breakpointId: "base",
      styleSourceId: "image-style",
      property: "width",
      value: { type: "unit", value: 100, unit: "%" },
    });
    const source = `![Standalone](./hero.png)

Before [![Mountain sunrise](./hero.png)](/gallery) and ![](./hero.png).

- ![List image](./hero.png)

| Image |
| --- |
| ![Table image](./hero.png) |
`;

    const result = await materializeMdxSource({
      source,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    const images = result.root.fragment.instances.filter(
      ({ component }) => component === "Image"
    );

    expect(images).toHaveLength(5);
    for (const image of images) {
      expect(result.root.fragment.styleSourceSelections).toContainEqual(
        expect.objectContaining({ instanceId: image.id })
      );
      expect(
        result.root.fragment.props.filter(
          ({ instanceId }) => instanceId === image.id
        )
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: "src",
            type: "asset",
            value: "hero",
          }),
          expect.objectContaining({
            name: "width",
            type: "asset",
            value: "hero",
          }),
          expect.objectContaining({
            name: "height",
            type: "asset",
            value: "hero",
          }),
        ])
      );
    }
    const serialized = await serializeMdxAuthoredContent({
      root: result.root,
      fragment: result.root.fragment,
    });
    const reloaded = await materializeMdxSource({
      source: serialized,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    expect(
      reloaded.root.fragment.instances.filter(
        ({ component }) => component === "Image"
      )
    ).toHaveLength(5);
    expect(serialized.match(/\.\/hero\.png/g)).toHaveLength(5);

    const edited = structuredClone(result.root.fragment);
    const firstImage = images[0];
    if (firstImage === undefined) {
      throw new Error("Expected first Image");
    }
    const alt = edited.props.find(
      (prop) => prop.instanceId === firstImage.id && prop.name === "alt"
    );
    if (alt?.type !== "string") {
      throw new Error("Expected authored Image alt text");
    }
    alt.value = "Changed alt";
    await expect(
      serializeMdxAuthoredContent({ root: result.root, fragment: edited })
    ).resolves.toContain("![Changed alt](./hero.png)");
  });

  test("keeps the Image template when an edit requires JSX", async () => {
    const sourceData = createSourceData();
    sourceData.instances.set("image-template", {
      type: "instance",
      id: "image-template",
      component: "Image",
      label: "Image",
      children: [],
    });
    sourceData.instances.get("templates")?.children.push({
      type: "id",
      value: "image-template",
    });
    const result = await materializeMdxSource({
      source: "Before ![Hero](https://example.com/hero.png) after.\n",
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    const edited = structuredClone(result.root.fragment);
    const image = edited.instances.find(
      ({ component }) => component === "Image"
    );
    if (image === undefined) {
      throw new Error("Expected Image");
    }
    edited.props.push({
      id: "image-class",
      instanceId: image.id,
      name: "class",
      type: "string",
      value: "featured",
    });

    const source = await serializeMdxAuthoredContent({
      root: result.root,
      fragment: edited,
    });
    const reloaded = await materializeMdxSource({
      source,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });

    expect(source).toBe(
      'Before <Image src="https://example.com/hero.png" alt="Hero" className="featured" /> after.\n'
    );
    expect(
      reloaded.root.fragment.instances.find(
        ({ component }) => component === "Image"
      )
    ).toBeDefined();
  });

  test("does not turn an external Image URL into derived Asset props", async () => {
    const sourceData = createSourceData();
    sourceData.instances.set("image-template", {
      type: "instance",
      id: "image-template",
      component: "Image",
      label: "Image",
      children: [],
    });
    for (const name of ["width", "height", "alt"] as const) {
      sourceData.props.set(`image-${name}`, {
        id: `image-${name}`,
        instanceId: "image-template",
        name,
        type: "string",
        value: "template default",
      });
    }
    sourceData.instances.get("templates")?.children.push({
      type: "id",
      value: "image-template",
    });
    const source = "![](https://example.com/hero.png)\n";

    const result = await materializeMdxSource({
      source,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });

    expect(
      result.root.fragment.props.map(({ name, type, value }) => ({
        name,
        type,
        value,
      }))
    ).toEqual([
      {
        name: "src",
        type: "string",
        value: "https://example.com/hero.png",
      },
    ]);
    await expect(
      serializeMdxAuthoredContent({
        root: result.root,
        fragment: result.root.fragment,
      })
    ).resolves.toBe(source);
  });

  test("keeps unresolved relative Image sources literal without derived Asset props", async () => {
    const sourceData = createAssetSourceData();
    sourceData.instances.set("image-template", {
      type: "instance",
      id: "image-template",
      component: "Image",
      label: "Image",
      children: [],
    });
    for (const name of ["width", "height", "alt"] as const) {
      sourceData.props.set(`image-${name}`, {
        id: `image-${name}`,
        instanceId: "image-template",
        name,
        type: "string",
        value: "template default",
      });
    }
    sourceData.instances.get("templates")?.children.push({
      type: "id",
      value: "image-template",
    });
    const source = `![Authored alt](./missing-markdown.png)

<Image src="./missing-jsx.png" />
`;

    const result = await materializeMdxSource({
      source,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    const propsBySource = new Map(
      result.root.fragment.instances.flatMap((instance) => {
        if (instance.component !== "Image") {
          return [];
        }
        const props = result.root.fragment.props.filter(
          ({ instanceId }) => instanceId === instance.id
        );
        const src = props.find(({ name }) => name === "src");
        return src?.type === "string" ? [[src.value, props] as const] : [];
      })
    );

    const markdownProps = propsBySource
      .get("./missing-markdown.png")
      ?.map(({ name, type, value }) => ({ name, type, value }));
    expect(markdownProps).toHaveLength(2);
    expect(markdownProps).toEqual(
      expect.arrayContaining([
        { name: "src", type: "string", value: "./missing-markdown.png" },
        { name: "alt", type: "string", value: "Authored alt" },
      ])
    );
    expect(
      propsBySource
        .get("./missing-jsx.png")
        ?.map(({ name, type, value }) => ({ name, type, value }))
    ).toEqual([{ name: "src", type: "string", value: "./missing-jsx.png" }]);
    expect(result.root.fragment.assets).toEqual([]);
    await expect(
      serializeMdxAuthoredContent({
        root: result.root,
        fragment: result.root.fragment,
      })
    ).resolves.toBe(source);
  });

  test("uses the shared recovery result and materializes valid siblings", async () => {
    const result = await materializeMdxSource({
      source: "# Hello\n\n{dangerous()}\n\nAfter",
      identity,
      data,
      metas: componentMetas,
      projectId: "project",
    });

    expect(result.root.fragment.instances.map(({ tag }) => tag)).toEqual([
      "h1",
      "p",
    ]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      code: "unsafe-mdx",
      contentRef: "article.mdx",
      renderScope: "page",
    });
  });

  test("reports authored elements that violate the HTML content model", async () => {
    const result = await materializeMdxSource({
      source: `1. test

   <ws.element ws:tag="li">nested item</ws.element>
`,
      identity,
      data,
      metas: componentMetas,
      projectId: "project",
    });

    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: "invalid-mdx",
        severity: "error",
        message: "Placing <li> element inside a <li> violates HTML spec.",
        sourceRange: expect.objectContaining({
          start: expect.objectContaining({ line: 3 }),
        }),
      }),
    ]);
  });

  test("resolves relative authored Asset references with canonical Asset names", async () => {
    const sourceData: Omit<WebstudioData, "pages"> = {
      ...data,
      assetFolders: new Map(),
      assets: new Map<string, Asset>([
        [
          "article",
          {
            id: "article",
            projectId: "project",
            type: "file",
            format: "mdx",
            name: "article_hash.mdx",
            filename: "article",
            size: 0,
            createdAt: "2026-01-01T00:00:00.000Z",
            description: null,
            meta: {},
          },
        ],
        [
          "hero",
          {
            id: "hero",
            projectId: "project",
            type: "image",
            format: "png",
            name: "hero_hash.png",
            filename: "hero",
            size: 0,
            createdAt: "2026-01-01T00:00:00.000Z",
            description: null,
            meta: { width: 100, height: 100 },
          },
        ],
      ]),
    };

    const result = await materializeMdxSource({
      source: `---
featureImage:
  $ref: ./hero.png
---

![Hero](./hero.png)`,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });

    expect(result.root.fragment.props).toContainEqual(
      expect.objectContaining({ name: "src", type: "asset", value: "hero" })
    );
    expect(result.root.fragment.assets).toEqual([
      expect.objectContaining({ id: "hero" }),
    ]);
    expect(result.root.resolvedFrontmatter).toMatchObject({
      featureImage: {
        id: "hero",
        src: expect.stringContaining("hero_hash.png"),
        width: 100,
        height: 100,
      },
    });
  });

  test("serializes an Asset selected on an inserted Image template", async () => {
    const sourceData: Omit<WebstudioData, "pages"> = {
      ...createSourceData(),
      assetFolders: new Map(),
      assets: new Map<string, Asset>([
        [
          "article",
          {
            id: "article",
            projectId: "project",
            type: "file",
            format: "mdx",
            name: "article_hash.mdx",
            filename: "article",
            size: 0,
            createdAt: "2026-01-01T00:00:00.000Z",
            description: null,
            meta: {},
          },
        ],
        [
          "hero",
          {
            id: "hero",
            projectId: "project",
            type: "image",
            format: "png",
            name: "hero_hash.png",
            filename: "hero",
            size: 0,
            createdAt: "2026-01-01T00:00:00.000Z",
            description: null,
            meta: { width: 100, height: 100 },
          },
        ],
      ]),
    };
    sourceData.instances.set("image-template", {
      type: "instance",
      id: "image-template",
      component: "Image",
      children: [],
    });
    sourceData.instances.get("templates")?.children.push({
      type: "id",
      value: "image-template",
    });
    const result = await materializeMdxSource({
      source: '<ws.element ws:name="Image" />',
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    const fragment = structuredClone(result.root.fragment);
    const image = fragment.instances.find(
      ({ component }) => component === "Image"
    );
    if (image === undefined) {
      throw new Error("Expected materialized Image");
    }
    for (const name of ["src", "width", "height", "alt"]) {
      fragment.props.push({
        id: `image-${name}`,
        instanceId: image.id,
        name,
        type: "asset",
        value: "hero",
      });
    }
    const hero = sourceData.assets.get("hero");
    if (hero === undefined) {
      throw new Error("Expected hero Asset");
    }
    fragment.assets.push(hero);

    const source = await serializeMdxAuthoredContent({
      root: result.root,
      fragment,
    });
    expect(source).toBe('<ws.element ws:name="Image" src="./hero.png" />\n');

    const customized = structuredClone(fragment);
    customized.props.push({
      id: "image-class",
      instanceId: image.id,
      name: "class",
      type: "string",
      value: "hero",
    });
    expect(
      await serializeMdxAuthoredContent({
        root: result.root,
        fragment: customized,
      })
    ).toBe(
      '<ws.element ws:name="Image" src="./hero.png" className="hero" />\n'
    );

    const reloaded = await materializeMdxSource({
      source,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    expect(
      reloaded.root.fragment.props.map(({ name, type, value }) => ({
        name,
        type,
        value,
      }))
    ).toEqual(
      ["src", "width", "height", "alt"].map((name) => ({
        name,
        type: "asset",
        value: "hero",
      }))
    );
    expect(reloaded.root.fragment.instances).toEqual([
      expect.objectContaining({ component: "Image" }),
    ]);

    const reset = structuredClone(reloaded.root.fragment);
    reset.props = reset.props.filter(({ name }) => name !== "src");
    const resetSource = await serializeMdxAuthoredContent({
      root: reloaded.root,
      fragment: reset,
    });
    expect(resetSource).toBe('<ws.element ws:name="Image" />\n');
    const resetReloaded = await materializeMdxSource({
      source: resetSource,
      identity,
      data: sourceData,
      metas: componentMetas,
      projectId: "project",
    });
    expect(resetReloaded.root.fragment.props).toEqual([]);
  });
});
