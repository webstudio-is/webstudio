import { describe, expect, test } from "vitest";
import {
  discoverMdxBodyAssetReferences,
  parseMdxDocument,
  serializeMdxDocument,
} from "@webstudio-is/content-engine/mdx";
import {
  elementComponent,
  type ContentBlockExternalContentIdentity,
  type WebstudioFragment,
} from "@webstudio-is/sdk";
import {
  materializeMdxAuthoredContent,
  MdxAuthoredContentConflictError,
  rebaseMdxAuthoredContent,
  reconcileMdxAuthoredContent,
  serializeMdxAuthoredContent,
  serializeMdxTemplateInsertion,
} from "./mdx-authored-content";

const identity: ContentBlockExternalContentIdentity = {
  blockInstanceId: "block",
  assetId: "article",
  revision: "sha256:article",
  contentRef: "posts/article.mdx",
  format: "mdx",
  renderScope: "page:/article",
};

const emptyTemplates = {
  templates: [],
  diagnostics: [],
  dependencies: { templateNames: [], templates: [] },
} as const;

const htmlJsxPropContext = {
  acceptsHtmlAttributes: true,
  componentPropNames: [],
  htmlTag: "div",
  propTypes: [],
} as const;

const createCodeTextFragment = (theme = "github-light"): WebstudioFragment => ({
  children: [{ type: "id", value: "code" }],
  instances: [
    {
      type: "instance",
      id: "code",
      component: "CodeText",
      children: [{ type: "text", value: "const ready = true;" }],
    },
  ],
  props: [
    {
      id: "code-language",
      instanceId: "code",
      name: "language",
      type: "string",
      value: "javascript",
    },
    {
      id: "code-theme",
      instanceId: "code",
      name: "theme",
      type: "string",
      value: theme,
    },
  ],
  assets: [],
  dataSources: [],
  resources: [],
  breakpoints: [],
  styleSourceSelections: [],
  styleSources: [],
  styles: [],
});

describe("MDX authored content", () => {
  test("materializes and edits GitHub alerts without replacing their syntax", async () => {
    const source = "> [!NOTE]\n> Helpful **context**.\n";
    const document = await parseMdxDocument({ source });
    const root = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization: emptyTemplates,
    });
    const alert = root.fragment.instances.find(
      ({ component }) => component === "Alert"
    );
    if (alert === undefined) {
      throw new Error("Expected alert element");
    }
    const alertProps = root.fragment.props
      .filter(({ instanceId }) => instanceId === alert.id)
      .map(({ name, value }) => [name, value]);

    expect(Object.fromEntries(alertProps)).toEqual({ variant: "note" });
    expect(alert.children).toHaveLength(1);

    const edited = structuredClone(root.fragment);
    const context = edited.instances.find(({ tag }) => tag === "strong");
    if (context === undefined) {
      throw new Error("Expected alert strong text");
    }
    context.children = [{ type: "text", value: "details" }];
    const variant = edited.props.find(
      ({ instanceId, name }) => instanceId === alert.id && name === "variant"
    );
    if (variant?.type !== "string") {
      throw new Error("Expected alert variant");
    }
    variant.value = "warning";

    expect(await serializeMdxAuthoredContent({ root, fragment: edited })).toBe(
      "> [!WARNING]\n> Helpful **details**.\n"
    );
  });

  test("rejects a canvas edit prepared from a stale Asset document", async () => {
    const document = await parseMdxDocument({ source: "Original\n" });
    const root = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization: emptyTemplates,
    });
    const latest = await parseMdxDocument({ source: "Changed in file\n" });

    await expect(
      rebaseMdxAuthoredContent({
        root,
        fragment: root.fragment,
        latest,
      })
    ).rejects.toBeInstanceOf(MdxAuthoredContentConflictError);

    await expect(
      rebaseMdxAuthoredContent({
        root,
        fragment: root.fragment,
        latest: document,
        latestRevision: "sha256:new-revision",
      })
    ).rejects.toBeInstanceOf(MdxAuthoredContentConflictError);
  });

  test("combines ordered local edits from two occurrences of one Asset", async () => {
    const document = await parseMdxDocument({
      source: "# Heading\n\nParagraph\n",
    });
    const firstRoot = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization: emptyTemplates,
    });
    const secondRoot = materializeMdxAuthoredContent({
      identity: { ...identity, blockInstanceId: "second-block" },
      document,
      templateMaterialization: emptyTemplates,
    });
    const edit = (
      fragment: WebstudioFragment,
      tag: string,
      text: string
    ): WebstudioFragment => ({
      ...fragment,
      instances: fragment.instances.map((instance) =>
        instance.tag === tag
          ? { ...instance, children: [{ type: "text", value: text }] }
          : instance
      ),
    });
    const first = await rebaseMdxAuthoredContent({
      root: firstRoot,
      fragment: edit(firstRoot.fragment, "h1", "First edit"),
      latest: document,
    });
    const combined = await rebaseMdxAuthoredContent({
      root: secondRoot,
      fragment: edit(secondRoot.fragment, "p", "Second edit"),
      latest: first,
      latestIsLocal: true,
    });

    expect(serializeMdxDocument(combined)).toBe(
      "# First edit\n\nSecond edit\n"
    );
  });

  test("applies the later local edit when two occurrences edit the same node", async () => {
    const document = await parseMdxDocument({ source: "Original\n" });
    const firstRoot = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization: emptyTemplates,
    });
    const secondRoot = materializeMdxAuthoredContent({
      identity: { ...identity, blockInstanceId: "second-block" },
      document,
      templateMaterialization: emptyTemplates,
    });
    const editText = (
      fragment: WebstudioFragment,
      value: string
    ): WebstudioFragment => ({
      ...fragment,
      instances: fragment.instances.map((instance) => ({
        ...instance,
        children: [{ type: "text", value }],
      })),
    });
    const first = await rebaseMdxAuthoredContent({
      root: firstRoot,
      fragment: editText(firstRoot.fragment, "First"),
      latest: document,
    });
    const combined = await rebaseMdxAuthoredContent({
      root: secondRoot,
      fragment: editText(secondRoot.fragment, "Second"),
      latest: first,
      latestIsLocal: true,
    });

    expect(serializeMdxDocument(combined)).toBe("Second\n");
  });

  test("combines an earlier edit with a later sibling reorder", async () => {
    const document = await parseMdxDocument({
      source: "First\n\nSecond\n\nThird\n",
    });
    const firstRoot = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization: emptyTemplates,
    });
    const secondRoot = materializeMdxAuthoredContent({
      identity: { ...identity, blockInstanceId: "second-block" },
      document,
      templateMaterialization: emptyTemplates,
    });
    const firstInstanceId = firstRoot.fragment.children[0];
    const firstEdit: WebstudioFragment = {
      ...firstRoot.fragment,
      instances: firstRoot.fragment.instances.map((instance) =>
        firstInstanceId?.type === "id" && instance.id === firstInstanceId.value
          ? {
              ...instance,
              children: [{ type: "text", value: "Edited first" }],
            }
          : instance
      ),
    };
    const reordered: WebstudioFragment = {
      ...secondRoot.fragment,
      children: [
        secondRoot.fragment.children[2],
        secondRoot.fragment.children[0],
        secondRoot.fragment.children[1],
      ],
    };
    const first = await rebaseMdxAuthoredContent({
      root: firstRoot,
      fragment: firstEdit,
      latest: document,
    });
    const combined = await rebaseMdxAuthoredContent({
      root: secondRoot,
      fragment: reordered,
      latest: first,
      latestIsLocal: true,
    });

    expect(serializeMdxDocument(combined)).toBe(
      "Third\n\nEdited first\n\nSecond\n"
    );
  });

  test("preserves an earlier insertion when a later occurrence edits existing content", async () => {
    const document = await parseMdxDocument({ source: "Original\n" });
    const firstRoot = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization: emptyTemplates,
    });
    const secondRoot = materializeMdxAuthoredContent({
      identity: { ...identity, blockInstanceId: "second-block" },
      document,
      templateMaterialization: emptyTemplates,
    });
    const inserted: WebstudioFragment = {
      ...firstRoot.fragment,
      children: [
        ...firstRoot.fragment.children,
        { type: "id", value: "inserted" },
      ],
      instances: [
        ...firstRoot.fragment.instances,
        {
          type: "instance",
          id: "inserted",
          component: elementComponent,
          tag: "p",
          children: [{ type: "text", value: "Inserted" }],
        },
      ],
    };
    const edited: WebstudioFragment = {
      ...secondRoot.fragment,
      instances: secondRoot.fragment.instances.map((instance) => ({
        ...instance,
        children: [{ type: "text", value: "Edited" }],
      })),
    };
    const first = await rebaseMdxAuthoredContent({
      root: firstRoot,
      fragment: inserted,
      latest: document,
    });
    const combined = await rebaseMdxAuthoredContent({
      root: secondRoot,
      fragment: edited,
      latest: first,
      latestIsLocal: true,
    });

    expect(serializeMdxDocument(combined)).toBe("Edited\n\nInserted\n");
  });

  test("serializes standard inserted content as Markdown and omits draft paragraphs", async () => {
    const document = await parseMdxDocument({ source: "" });
    const root = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization: emptyTemplates,
    });
    const fragment: WebstudioFragment = {
      ...root.fragment,
      children: [
        { type: "id", value: "paragraph" },
        { type: "id", value: "list" },
        { type: "id", value: "draft" },
      ],
      instances: [
        {
          type: "instance",
          id: "paragraph",
          component: elementComponent,
          tag: "p",
          children: [
            { type: "text", value: "Read the " },
            { type: "id", value: "link" },
            { type: "text", value: "." },
          ],
        },
        {
          type: "instance",
          id: "link",
          component: elementComponent,
          tag: "a",
          children: [{ type: "text", value: "guide" }],
        },
        {
          type: "instance",
          id: "list",
          component: elementComponent,
          tag: "ul",
          children: [
            { type: "id", value: "first-item" },
            { type: "id", value: "second-item" },
          ],
        },
        {
          type: "instance",
          id: "first-item",
          component: elementComponent,
          tag: "li",
          children: [{ type: "text", value: "First" }],
        },
        {
          type: "instance",
          id: "second-item",
          component: elementComponent,
          tag: "li",
          children: [{ type: "text", value: "Second" }],
        },
        {
          type: "instance",
          id: "draft",
          component: elementComponent,
          tag: "p",
          children: [],
        },
      ],
      props: [
        {
          id: "href",
          instanceId: "link",
          name: "href",
          type: "string",
          value: "https://wstd.us/content-block",
        },
      ],
    };

    await expect(serializeMdxAuthoredContent({ root, fragment })).resolves.toBe(
      "Read the [guide](https://wstd.us/content-block).\n\n-   First\n-   Second\n"
    );
  });

  test("serializes a sibling inserted into an authored list as a Markdown item", async () => {
    const document = await parseMdxDocument({ source: "1. First\n" });
    const root = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization: emptyTemplates,
    });
    const fragment = structuredClone(root.fragment);
    const list = fragment.instances.find(({ tag }) => tag === "ol");
    if (list === undefined) {
      throw new Error("Expected an ordered list");
    }
    list.children.push({ type: "id", value: "second-item" });
    fragment.instances.push({
      type: "instance",
      id: "second-item",
      component: elementComponent,
      tag: "li",
      children: [{ type: "text", value: "Second" }],
    });

    await expect(serializeMdxAuthoredContent({ root, fragment })).resolves.toBe(
      "1.  First\n2.  Second\n"
    );
  });

  test("does not persist newly inserted empty Markdown drafts", async () => {
    const document = await parseMdxDocument({ source: "" });
    const root = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization: emptyTemplates,
    });
    const fragment: WebstudioFragment = {
      ...root.fragment,
      children: [
        { type: "id", value: "heading" },
        { type: "id", value: "empty-list" },
        { type: "id", value: "list" },
      ],
      instances: [
        {
          type: "instance",
          id: "heading",
          component: elementComponent,
          tag: "h6",
          children: [],
        },
        {
          type: "instance",
          id: "empty-list",
          component: elementComponent,
          tag: "ul",
          children: [{ type: "id", value: "empty-list-item" }],
        },
        {
          type: "instance",
          id: "empty-list-item",
          component: elementComponent,
          tag: "li",
          children: [],
        },
        {
          type: "instance",
          id: "list",
          component: elementComponent,
          tag: "ul",
          children: [
            { type: "id", value: "empty-item" },
            { type: "id", value: "kept-item" },
          ],
        },
        {
          type: "instance",
          id: "empty-item",
          component: elementComponent,
          tag: "li",
          children: [],
        },
        {
          type: "instance",
          id: "kept-item",
          component: elementComponent,
          tag: "li",
          children: [{ type: "text", value: "Kept" }],
        },
      ],
    };

    await expect(serializeMdxAuthoredContent({ root, fragment })).resolves.toBe(
      "-   Kept\n"
    );
  });

  test("preserves empty Markdown nodes authored in the file", async () => {
    const document = await parseMdxDocument({ source: "######\n\n-\n" });
    const root = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization: emptyTemplates,
    });

    await expect(
      serializeMdxAuthoredContent({ root, fragment: root.fragment })
    ).resolves.toBe("######\n\n-\n");
  });

  test("serializes a lossless template insertion as Markdown", async () => {
    const fragment: WebstudioFragment = {
      children: [{ type: "id", value: "heading" }],
      instances: [
        {
          type: "instance",
          id: "heading",
          component: elementComponent,
          tag: "h1",
          label: "Heading 1",
          children: [{ type: "text", value: "Test" }],
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
    };

    expect(
      serializeMdxDocument(
        await serializeMdxTemplateInsertion({
          identity,
          fragment,
          templateName: "Heading 1",
        })
      )
    ).toBe("# Test\n");
  });

  test("serializes Markdown-compatible Image props as an image", async () => {
    const fragment: WebstudioFragment = {
      children: [{ type: "id", value: "image" }],
      instances: [
        {
          type: "instance",
          id: "image",
          component: "Image",
          children: [],
        },
      ],
      props: [
        {
          id: "image-src",
          instanceId: "image",
          name: "src",
          type: "string",
          value: "/hero.png",
        },
        {
          id: "image-alt",
          instanceId: "image",
          name: "alt",
          type: "string",
          value: "Hero",
        },
        {
          id: "image-title",
          instanceId: "image",
          name: "title",
          type: "string",
          value: "Cover",
        },
      ],
      assets: [],
      dataSources: [],
      resources: [],
      breakpoints: [],
      styleSourceSelections: [],
      styleSources: [],
      styles: [],
    };

    expect(
      serializeMdxDocument(
        await serializeMdxTemplateInsertion({
          identity,
          fragment,
          templateName: "Image",
        })
      )
    ).toBe('![Hero](/hero.png "Cover")\n');
  });

  test("uses JSX when an Image has props Markdown cannot express", async () => {
    const fragment: WebstudioFragment = {
      children: [{ type: "id", value: "image" }],
      instances: [
        {
          type: "instance",
          id: "image",
          component: "Image",
          children: [],
        },
      ],
      props: [
        {
          id: "image-src",
          instanceId: "image",
          name: "src",
          type: "string",
          value: "/hero.png",
        },
        {
          id: "image-width",
          instanceId: "image",
          name: "width",
          type: "number",
          value: 640,
        },
      ],
      assets: [],
      dataSources: [],
      resources: [],
      breakpoints: [],
      styleSourceSelections: [],
      styleSources: [],
      styles: [],
    };

    expect(
      serializeMdxDocument(
        await serializeMdxTemplateInsertion({
          identity,
          fragment,
          templateName: "Image",
        })
      )
    ).toBe('<ws.element ws:name="Image" src="/hero.png" width="640" />\n');
  });

  test("uses canonical JSX names in a generic template insertion", async () => {
    const fragment: WebstudioFragment = {
      children: [{ type: "id", value: "widget" }],
      instances: [
        {
          type: "instance",
          id: "widget",
          component: "Widget",
          children: [],
        },
      ],
      props: [
        {
          id: "widget:class",
          instanceId: "widget",
          name: "class",
          type: "string",
          value: "featured",
        },
      ],
      assets: [],
      dataSources: [],
      resources: [],
      breakpoints: [],
      styleSourceSelections: [],
      styleSources: [],
      styles: [],
    };

    expect(
      serializeMdxDocument(
        await serializeMdxTemplateInsertion({
          identity,
          fragment,
          templateName: "Widget",
        })
      )
    ).toBe('<ws.element ws:name="Widget" className="featured" />\n');
  });

  test("preserves unknown component props in a generic template insertion", async () => {
    const fragment: WebstudioFragment = {
      children: [{ type: "id", value: "widget" }],
      instances: [
        {
          type: "instance",
          id: "widget",
          component: "Widget",
          children: [],
        },
      ],
      props: [
        {
          id: "widget:for",
          instanceId: "widget",
          name: "for",
          type: "string",
          value: "custom-target",
        },
      ],
      assets: [],
      dataSources: [],
      resources: [],
      breakpoints: [],
      styleSourceSelections: [],
      styleSources: [],
      styles: [],
    };

    expect(
      serializeMdxDocument(
        await serializeMdxTemplateInsertion({
          identity,
          fragment,
          templateName: "Widget",
        })
      )
    ).toBe('<ws.element ws:name="Widget" for="custom-target" />\n');
  });

  test("rebases a styled template insertion as a template reference", async () => {
    const document = await parseMdxDocument({ source: "" });
    const root = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization: emptyTemplates,
    });
    const fragment: WebstudioFragment = {
      children: [{ type: "id", value: "heading" }],
      instances: [
        {
          type: "instance",
          id: "heading",
          component: elementComponent,
          tag: "h1",
          label: "Styled Heading",
          children: [{ type: "text", value: "Test" }],
        },
      ],
      props: [
        {
          id: "title",
          instanceId: "heading",
          name: "title",
          type: "string",
          value: "Updated",
        },
      ],
      assets: [],
      dataSources: [],
      resources: [],
      breakpoints: [{ id: "base", label: "Base" }],
      styleSourceSelections: [
        { instanceId: "heading", values: ["heading-style"] },
      ],
      styleSources: [{ type: "local", id: "heading-style" }],
      styles: [
        {
          breakpointId: "base",
          styleSourceId: "heading-style",
          property: "color",
          value: { type: "keyword", value: "red" },
        },
      ],
    };

    expect(
      serializeMdxDocument(
        await rebaseMdxAuthoredContent({
          root,
          fragment,
          latest: document,
          insertedTemplateNames: new Map([["heading", "Styled Heading"]]),
        })
      )
    ).toBe(
      '<ws.element ws:name="Styled Heading" title="Updated">Test</ws.element>\n'
    );
  });

  test("serializes explicitly configured Code Text presentation as JSX", async () => {
    const document = await serializeMdxTemplateInsertion({
      identity,
      fragment: createCodeTextFragment(),
      templateName: "CodeText",
    });

    expect(serializeMdxDocument(document)).toBe(
      '<ws.element ws:name="CodeText" language="javascript" theme="github-light">const ready = true;</ws.element>\n'
    );
  });

  test("serializes Code Text without presentation props as fenced Markdown", async () => {
    const fragment = createCodeTextFragment();
    fragment.props = [];
    const code = fragment.instances[0]?.children[0];
    if (code?.type !== "text") {
      throw new Error("Expected code text");
    }
    code.value = "a = 1\nb=2\nc=5";

    const document = await serializeMdxTemplateInsertion({
      identity,
      fragment,
      templateName: "CodeText",
    });

    expect(serializeMdxDocument(document)).toBe("```\na = 1\nb=2\nc=5\n```\n");
  });

  test("serializes the legacy Code Text code property as text content", async () => {
    const fragment = createCodeTextFragment();
    const instance = fragment.instances[0];
    if (instance === undefined) {
      throw new Error("Expected Code Text instance");
    }
    const [code] = instance.children.splice(0);
    if (code?.type !== "text") {
      throw new Error("Expected code text");
    }
    fragment.props.push({
      id: "legacy-code",
      instanceId: instance.id,
      name: "code",
      type: "string",
      value: code.value,
    });

    const document = await serializeMdxTemplateInsertion({
      identity,
      fragment,
      templateName: "Code Text",
    });

    expect(serializeMdxDocument(document)).toBe(
      '<ws.element ws:name="Code Text" language="javascript" theme="github-light">const ready = true;</ws.element>\n'
    );
  });

  test("materializes fenced Markdown as editable Code Text", async () => {
    const document = await parseMdxDocument({
      source: "```javascript\nconst ready = true;\n```\n",
    });
    const root = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization: emptyTemplates,
    });
    const instance = root.fragment.instances[0];

    expect(instance).toMatchObject({
      component: "CodeText",
      children: [{ type: "text", value: "const ready = true;" }],
    });
    expect(
      Object.fromEntries(
        root.fragment.props.map((prop) => [prop.name, prop.value])
      )
    ).toEqual({
      language: "javascript",
    });
    expect(
      await serializeMdxAuthoredContent({ root, fragment: root.fragment })
    ).toBe("```javascript\nconst ready = true;\n```\n");
  });

  test("keeps defaults implicit when rematerializing a plain code fence", async () => {
    const source = "```\na = 1\nb=2\nc=5\n```\n";
    const document = await parseMdxDocument({ source });
    const root = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization: emptyTemplates,
    });

    expect(root.fragment.props).toEqual([]);
    expect(
      await serializeMdxAuthoredContent({ root, fragment: root.fragment })
    ).toBe(source);
  });

  test("removes a reset language from a fenced code block", async () => {
    const document = await parseMdxDocument({
      source: "```javascript\nconst ready = true;\n```\n",
    });
    const root = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization: emptyTemplates,
    });
    const reset = structuredClone(root.fragment);
    reset.props = reset.props.filter(({ name }) => name !== "language");

    expect(await serializeMdxAuthoredContent({ root, fragment: reset })).toBe(
      "```\nconst ready = true;\n```\n"
    );
  });

  test("keeps Code Text with non-default presentation as JSX", async () => {
    const document = await serializeMdxTemplateInsertion({
      identity,
      fragment: createCodeTextFragment("nord"),
      templateName: "Code Text",
    });
    const source = serializeMdxDocument(document);

    expect(source).toContain('<ws.element ws:name="Code Text"');
    expect(source).toContain('theme="nord"');
  });

  test("keeps Code Text with additional props as JSX", async () => {
    const fragment = createCodeTextFragment();
    fragment.props.push({
      id: "code-id",
      instanceId: "code",
      name: "id",
      type: "string",
      value: "example",
    });

    const document = await serializeMdxTemplateInsertion({
      identity,
      fragment,
      templateName: "Code Text",
    });
    const source = serializeMdxDocument(document);

    expect(source).toContain('<ws.element ws:name="Code Text"');
    expect(source).toContain('id="example"');
  });

  test("serializes static number and false props in component JSX", async () => {
    const fragment = createCodeTextFragment();
    fragment.props = [
      {
        id: "code-tabindex",
        instanceId: "code",
        name: "tabindex",
        type: "number",
        value: 2,
      },
      {
        id: "code-hidden",
        instanceId: "code",
        name: "hidden",
        type: "boolean",
        value: false,
      },
    ];

    const document = await serializeMdxTemplateInsertion({
      identity,
      fragment,
      templateName: "CodeText",
    });

    expect(serializeMdxDocument(document)).toBe(
      '<ws.element ws:name="CodeText" tabIndex="2" hidden="false">const ready = true;</ws.element>\n'
    );
  });

  test("keeps Code Text whitespace that Markdown cannot preserve as JSX", async () => {
    const fragment = createCodeTextFragment();
    const code = fragment.instances[0]?.children[0];
    if (code?.type !== "text") {
      throw new Error("Expected code text");
    }
    code.value += "\n";

    const document = await serializeMdxTemplateInsertion({
      identity,
      fragment,
      templateName: "Code Text",
    });

    expect(serializeMdxDocument(document)).toContain("const ready = true;\n");
  });

  test("switches materialized Code Text to JSX when it gains unsupported props", async () => {
    const document = await parseMdxDocument({
      source: "```javascript\nconst ready = true;\n```\n",
    });
    const root = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization: emptyTemplates,
    });
    const fragment = structuredClone(root.fragment);
    fragment.props.push({
      id: "authored-theme",
      instanceId: fragment.instances[0]!.id,
      name: "theme",
      type: "string",
      value: "nord",
    });

    expect(await serializeMdxAuthoredContent({ root, fragment })).toContain(
      '<ws.element ws:name="CodeText" language="javascript" theme="nord">const ready = true;</ws.element>'
    );
  });

  test("round-trips Code Text through JSX and back to a fence", async () => {
    const fence = await parseMdxDocument({
      source: "```\nconst ready = true;\n```\n",
    });
    const fenceRoot = materializeMdxAuthoredContent({
      identity,
      document: fence,
      templateMaterialization: emptyTemplates,
    });
    const withClass = structuredClone(fenceRoot.fragment);
    withClass.props.push({
      id: "code-class",
      instanceId: withClass.instances[0]!.id,
      name: "class",
      type: "string",
      value: "example",
    });
    const jsxSource = await serializeMdxAuthoredContent({
      root: fenceRoot,
      fragment: withClass,
    });
    expect(jsxSource).toBe(
      '<ws.element ws:name="CodeText" className="example">const ready = true;</ws.element>\n'
    );

    const jsx = await parseMdxDocument({ source: jsxSource });
    const authoredTemplate = jsx.children[0];
    if (authoredTemplate?.type !== "template") {
      throw new Error("Expected Code Text template reference");
    }
    const templateFragment = createCodeTextFragment();
    templateFragment.props = [
      {
        id: "template-class",
        instanceId: "code",
        name: "class",
        type: "string",
        value: "example",
      },
    ];
    const jsxRoot = materializeMdxAuthoredContent({
      identity,
      document: jsx,
      templateMaterialization: {
        templates: [
          {
            type: "resolved-template",
            reference: {
              type: "resolved-template",
              path: [0],
              templateName: "CodeText",
              templateInstanceId: "code-template",
              props: authoredTemplate.props,
            },
            fragment: templateFragment,
            editablePropNames: ["class", "language", "theme"],
            jsxPropContext: htmlJsxPropContext,
            propNameMappings: [
              { jsxPropName: "className", instancePropName: "class" },
            ],
            ignoredJsxPropNames: [],
          },
        ],
        diagnostics: [],
        dependencies: { templateNames: ["CodeText"], templates: [] },
      },
    });
    const reset = structuredClone(jsxRoot.fragment);
    reset.props = reset.props.filter(({ name }) => name !== "class");

    expect(
      await serializeMdxAuthoredContent({ root: jsxRoot, fragment: reset })
    ).toBe("```\nconst ready = true;\n```\n");
  });

  test("persists a newly authored prop on an existing template reference", async () => {
    const document = await parseMdxDocument({
      source: '<ws.element ws:name="CodeText">const ready = true;</ws.element>',
    });
    const authoredTemplate = document.children[0];
    if (authoredTemplate?.type !== "template") {
      throw new Error("Expected Code Text template reference");
    }
    const root = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization: {
        templates: [
          {
            type: "resolved-template",
            reference: {
              type: "resolved-template",
              path: [0],
              templateName: "CodeText",
              templateInstanceId: "code-template",
              props: authoredTemplate.props,
            },
            fragment: createCodeTextFragment(),
            editablePropNames: ["language", "theme"],
            jsxPropContext: htmlJsxPropContext,
            propNameMappings: [],
            ignoredJsxPropNames: [],
          },
        ],
        diagnostics: [],
        dependencies: { templateNames: ["CodeText"], templates: [] },
      },
    });
    const next = structuredClone(root.fragment);
    const theme = next.props.find(({ name }) => name === "theme");
    if (theme?.type !== "string") {
      throw new Error("Expected theme prop");
    }
    theme.value = "nord";

    expect(
      serializeMdxDocument(
        reconcileMdxAuthoredContent({ root, fragment: next })
      )
    ).toBe(
      '<ws.element ws:name="CodeText" language="javascript" theme="nord">const ready = true;</ws.element>\n'
    );
  });

  test("switches a Code Text template reference to a fence after resetting presentation props", async () => {
    const document = await parseMdxDocument({
      source:
        '<ws.element ws:name="CodeText" language="javascript" theme="github-light">const ready = true;</ws.element>',
    });
    const authoredTemplate = document.children[0];
    if (authoredTemplate?.type !== "template") {
      throw new Error("Expected Code Text template reference");
    }
    const root = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization: {
        templates: [
          {
            type: "resolved-template",
            reference: {
              type: "resolved-template",
              path: [0],
              templateName: "CodeText",
              templateInstanceId: "code-template",
              props: authoredTemplate.props,
            },
            fragment: createCodeTextFragment(),
            editablePropNames: ["language", "theme"],
            jsxPropContext: htmlJsxPropContext,
            propNameMappings: [
              { jsxPropName: "language", instancePropName: "language" },
              { jsxPropName: "theme", instancePropName: "theme" },
            ],
            ignoredJsxPropNames: [],
          },
        ],
        diagnostics: [],
        dependencies: { templateNames: ["CodeText"], templates: [] },
      },
    });
    const next = structuredClone(root.fragment);
    next.props = next.props.filter(
      ({ name }) => name !== "language" && name !== "theme"
    );

    expect(
      serializeMdxDocument(
        reconcileMdxAuthoredContent({ root, fragment: next })
      )
    ).toBe("```\nconst ready = true;\n```\n");
  });

  test("materializes deterministic nested Markdown and MDX elements", async () => {
    const document = await parseMdxDocument({
      source: `# Heading\n\n<ws.element ws:tag="section" data-kind="intro"><ws.element ws:tag="strong">Body</ws.element></ws.element>`,
    });
    const first = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization: emptyTemplates,
    });
    const second = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization: emptyTemplates,
    });
    const otherScope = materializeMdxAuthoredContent({
      identity: { ...identity, renderScope: "page:/other" },
      document,
      templateMaterialization: emptyTemplates,
    });
    const otherRevision = materializeMdxAuthoredContent({
      identity: { ...identity, revision: "sha256:next" },
      document,
      templateMaterialization: emptyTemplates,
    });

    expect(second.fragment).toEqual(first.fragment);
    expect(otherScope.fragment.instances[0].id).not.toBe(
      first.fragment.instances[0].id
    );
    expect(otherRevision.fragment.instances[0].id).toBe(
      first.fragment.instances[0].id
    );
    expect(
      first.fragment.instances.map(({ component, tag }) => [component, tag])
    ).toEqual([
      [elementComponent, "h1"],
      [elementComponent, "strong"],
      [elementComponent, "section"],
    ]);
  });

  test("round-trips typed static props on generic MDX elements", async () => {
    const source =
      '<ws.element ws:tag="input" tabIndex="2" hidden="false" />\n';
    const document = await parseMdxDocument({ source });
    const root = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization: emptyTemplates,
    });

    expect(root.fragment.props).toEqual([
      expect.objectContaining({
        name: "tabindex",
        type: "number",
        value: 2,
      }),
      expect.objectContaining({
        name: "hidden",
        type: "boolean",
        value: false,
      }),
    ]);
    expect(
      await serializeMdxAuthoredContent({ root, fragment: root.fragment })
    ).toBe(source);
  });

  test("reconciles text, props, insertion, deletion, and reorder semantically", async () => {
    const document = await parseMdxDocument({
      source: `---\ntitle: Example\n---\n\n{/* before */}\n\n# First\n\n<ws.element ws:tag="p" class="lead">Second</ws.element>`,
    });
    const root = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization: emptyTemplates,
    });
    const [headingId, paragraphId] = root.fragment.children.flatMap((child) =>
      child.type === "id" ? [child.value] : []
    );
    const next = structuredClone(root.fragment);
    next.children = [
      { type: "id", value: paragraphId },
      { type: "id", value: "inserted" },
    ];
    next.instances = [
      ...next.instances.filter(({ id }) => id !== headingId),
      {
        type: "instance",
        id: "inserted",
        component: elementComponent,
        tag: "aside",
        children: [{ type: "text", value: "New" }],
      },
    ];
    const paragraph = next.instances.find(({ id }) => id === paragraphId)!;
    paragraph.children = [{ type: "text", value: "Changed" }];
    const paragraphProp = next.props.find(
      ({ instanceId, name }) => instanceId === paragraphId && name === "class"
    )!;
    paragraphProp.value = "summary";
    const nextBeforeReconcile = structuredClone(next);
    const documentBeforeReconcile = structuredClone(document);

    const reconciled = reconcileMdxAuthoredContent({ root, fragment: next });
    expect(next).toEqual(nextBeforeReconcile);
    expect(document).toEqual(documentBeforeReconcile);
    expect(reconcileMdxAuthoredContent({ root, fragment: next })).toEqual(
      reconciled
    );
    const reparsed = await parseMdxDocument({
      source: serializeMdxDocument(reconciled),
    });

    expect(reparsed.frontmatter.properties).toEqual({ title: "Example" });
    expect(reparsed.children.map((node) => node.type)).toEqual([
      "comment",
      "element",
      "element",
    ]);
    expect(reparsed.children[1]).toMatchObject({
      type: "element",
      tag: "p",
      props: [{ name: "class", value: "summary" }],
      children: [{ type: "text", value: "Changed" }],
    });
    expect(reparsed.children[2]).toMatchObject({
      type: "element",
      syntax: "mdx",
      tag: "aside",
      children: [{ type: "text", value: "New" }],
    });
  });

  test("round-trips Markdown lists, tables, code whitespace, links, and marks", async () => {
    const document = await parseMdxDocument({
      source: `- First\n- Second with **bold** and [guide](./guide.pdf)\n\n| Name | Value |\n| --- | ---: |\n| Alpha | 1 |\n\n\`\`\`js\n  const value = 1;\n\`\`\``,
    });
    const root = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization: emptyTemplates,
    });
    const next = structuredClone(root.fragment);
    const code = next.instances.find(
      ({ component }) => component === "CodeText"
    );
    if (code === undefined) {
      throw new Error("Expected code instance");
    }
    const codeText = code.children[0];
    if (codeText?.type !== "text") {
      throw new Error("Expected code text");
    }
    codeText.value = "  const value = 2;";

    const reconciled = reconcileMdxAuthoredContent({ root, fragment: next });
    const serialized = serializeMdxDocument(reconciled);
    const reparsed = await parseMdxDocument({ source: serialized });
    const rematerialized = materializeMdxAuthoredContent({
      identity,
      document: reparsed,
      templateMaterialization: emptyTemplates,
    });

    expect(
      rematerialized.fragment.instances.map(({ component, tag }) => ({
        component,
        tag,
      }))
    ).toEqual(
      root.fragment.instances.map(({ component, tag }) => ({ component, tag }))
    );
    const rematerializedCode = rematerialized.fragment.instances.find(
      ({ component }) => component === "CodeText"
    );
    expect(rematerializedCode?.children).toEqual([
      { type: "text", value: "  const value = 2;" },
    ]);
    expect(serialized).toContain("**bold**");
  });

  test("synthesizes nested block and inline JSX with stable modes", async () => {
    const document = await parseMdxDocument({
      source: `<ws.element ws:tag="section"><ws.element ws:tag="p">Before</ws.element></ws.element>`,
    });
    const root = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization: emptyTemplates,
    });
    const next = structuredClone(root.fragment);
    const section = next.instances.find(({ tag }) => tag === "section")!;
    section.children.push({ type: "id", value: "aside" });
    next.instances.push(
      {
        type: "instance",
        id: "aside",
        component: elementComponent,
        tag: "aside",
        children: [{ type: "id", value: "inserted-paragraph" }],
      },
      {
        type: "instance",
        id: "inserted-paragraph",
        component: elementComponent,
        tag: "p",
        children: [{ type: "id", value: "strong" }],
      },
      {
        type: "instance",
        id: "strong",
        component: elementComponent,
        tag: "strong",
        children: [{ type: "text", value: "Nested" }],
      }
    );

    const serialized = serializeMdxDocument(
      reconcileMdxAuthoredContent({ root, fragment: next })
    );
    const reparsed = await parseMdxDocument({ source: serialized });
    const rematerialized = materializeMdxAuthoredContent({
      identity,
      document: reparsed,
      templateMaterialization: emptyTemplates,
    });

    expect(rematerialized.fragment.instances.map(({ tag }) => tag)).toEqual([
      "p",
      "strong",
      "p",
      "aside",
      "section",
    ]);
    const reparsedSection = reparsed.children[0];
    expect(
      reparsedSection.type === "element"
        ? reparsedSection.children.find(
            (node) => node.type === "element" && node.tag === "aside"
          )
        : undefined
    ).toMatchObject({ type: "element", syntax: "mdx", mdxMode: "flow" });
    expect(serializeMdxDocument(reparsed)).toBe(serialized);
  });

  test("preserves unresolved templates, comments, and ignored authored props", async () => {
    const document = await parseMdxDocument({
      source: `{/* note */}\n\n<ws.element ws:name="Missing" obsolete="yes">Keep me</ws.element>\n\nParagraph`,
    });
    const root = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization: {
        ...emptyTemplates,
        templates: [
          {
            type: "unresolved-template",
            reference: {
              type: "unresolved-template",
              path: [1],
              templateName: "Missing",
            },
            markerId: "missing",
          },
        ],
      },
    });
    const next = structuredClone(root.fragment);
    next.instances[0].children = [{ type: "text", value: "Changed" }];

    expect(root.provenance.unresolvedTemplates).toEqual([
      {
        path: [1],
        markerId: "missing",
        templateName: "Missing",
      },
    ]);

    const reconciled = reconcileMdxAuthoredContent({ root, fragment: next });

    expect(reconciled.children).toMatchObject([
      { type: "comment", value: "/* note */" },
      {
        type: "template",
        name: "Missing",
        props: [{ name: "obsolete", value: "yes" }],
        children: [{ type: "text", value: "Keep me" }],
      },
      {
        type: "element",
        children: [{ type: "text", value: "Changed" }],
      },
    ]);
  });

  test("places an unresolved-template placeholder at its authored nesting point", async () => {
    const document = await parseMdxDocument({
      source:
        '<ws.element ws:tag="section">Before<ws.element ws:name="Missing" />After</ws.element>',
    });
    const root = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization: {
        ...emptyTemplates,
        templates: [
          {
            type: "unresolved-template",
            reference: {
              type: "unresolved-template",
              path: [0, 1],
              templateName: "Missing",
            },
            markerId: "missing",
          },
        ],
      },
      createUnresolvedTemplateInstance: ({ markerId }) => ({
        type: "instance",
        id: markerId,
        component: elementComponent,
        tag: "div",
        children: [{ type: "text", value: "Missing template" }],
      }),
    });
    const section = root.fragment.instances.find(
      ({ tag }) => tag === "section"
    );

    expect(section?.children).toEqual([
      { type: "text", value: "Before" },
      { type: "id", value: "missing" },
      { type: "text", value: "After" },
    ]);
  });

  test("keeps an inline comment anchored when adjacent text is deleted", async () => {
    const document = await parseMdxDocument({
      source: `<ws.element ws:tag="p">Before{/* note */}After</ws.element>`,
    });
    const root = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization: emptyTemplates,
    });
    const next = structuredClone(root.fragment);
    next.instances[0].children = [{ type: "text", value: "After" }];

    const reconciled = reconcileMdxAuthoredContent({ root, fragment: next });
    const paragraph = reconciled.children[0];
    expect(
      paragraph.type === "element" ? paragraph.children : []
    ).toMatchObject([
      { type: "comment", value: "/* note */" },
      { type: "text", value: "After" },
    ]);
  });

  test("rejects changes to unsupported authored namespaces", async () => {
    const document = await parseMdxDocument({ source: "Paragraph" });
    const root = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization: emptyTemplates,
    });
    const next = structuredClone(root.fragment);
    next.styles.push({
      breakpointId: "base",
      styleSourceId: "local",
      property: "color",
      value: { type: "keyword", value: "red" },
    });

    expect(() => reconcileMdxAuthoredContent({ root, fragment: next })).toThrow(
      "cannot be represented losslessly in MDX"
    );
  });

  test("rejects duplicate props and reused instances instead of losing them", async () => {
    const document = await parseMdxDocument({
      source: `<ws.element ws:tag="p" class="first">Text</ws.element>`,
    });
    const root = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization: emptyTemplates,
    });
    const duplicateProp = structuredClone(root.fragment);
    const originalProp = duplicateProp.props[0];
    if (originalProp?.type !== "string") {
      throw new Error("Expected string prop");
    }
    duplicateProp.props.push({
      ...originalProp,
      id: "duplicate-prop",
      value: "second",
    });
    expect(() =>
      reconcileMdxAuthoredContent({ root, fragment: duplicateProp })
    ).toThrow('Duplicate authored prop "class"');

    const reusedInstance = structuredClone(root.fragment);
    reusedInstance.children.push(reusedInstance.children[0]);
    expect(() =>
      reconcileMdxAuthoredContent({ root, fragment: reusedInstance })
    ).toThrow("is reused");
  });

  test("preserves authored Asset references while changing content", async () => {
    const document = await parseMdxDocument({
      source: `<ws.element ws:tag="figure"><ws.element ws:tag="img" src="./hero.png" /><ws.element ws:tag="a" href="../files/guide.pdf">Read</ws.element></ws.element>`,
    });
    const root = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization: emptyTemplates,
      assetReferences: discoverMdxBodyAssetReferences({
        document,
        sourcePath: "posts/article.mdx",
        assetIdsByPath: new Map([
          ["posts/hero.png", "hero-asset"],
          ["files/guide.pdf", "guide-asset"],
        ]),
      }),
    });
    expect(root.fragment.props.map(({ type, value }) => [type, value])).toEqual(
      [
        ["asset", "hero-asset"],
        ["asset", "guide-asset"],
      ]
    );
    const next = structuredClone(root.fragment);
    next.instances.find(({ tag }) => tag === "a")!.children = [
      { type: "text", value: "Download" },
    ];

    const source = serializeMdxDocument(
      reconcileMdxAuthoredContent({ root, fragment: next })
    );
    expect(source).toContain('src="./hero.png"');
    expect(source).toContain('href="../files/guide.pdf"');
    expect(source).toContain("Download");

    const changedAsset = next.props.find(({ name }) => name === "src");
    if (changedAsset?.type !== "asset") {
      throw new Error("Expected Asset prop");
    }
    changedAsset.value = "other-asset";
    expect(() => reconcileMdxAuthoredContent({ root, fragment: next })).toThrow(
      'Asset prop "src" cannot be represented losslessly in MDX'
    );
  });

  test("updates template shell props without serializing expanded internals", async () => {
    const document = await parseMdxDocument({
      source: `<ws.element ws:name="Card" tone="quiet" legacy="authored" />`,
    });
    const templateFragment: WebstudioFragment = {
      children: [{ type: "id", value: "template-root" }],
      instances: [
        {
          type: "instance",
          id: "template-root",
          component: elementComponent,
          tag: "article",
          children: [{ type: "id", value: "template-heading" }],
        },
        {
          type: "instance",
          id: "template-heading",
          component: elementComponent,
          tag: "h2",
          children: [{ type: "text", value: "Template heading" }],
        },
      ],
      props: [
        {
          id: "tone",
          instanceId: "template-root",
          name: "tone",
          type: "string",
          value: "quiet",
        },
        {
          id: "legacy",
          instanceId: "template-root",
          name: "legacy",
          type: "string",
          value: "template default",
        },
      ],
      assets: [],
      dataSources: [],
      resources: [],
      breakpoints: [{ id: "base", label: "Base" }],
      styleSourceSelections: [
        { instanceId: "template-root", values: ["template-local"] },
      ],
      styleSources: [{ type: "local", id: "template-local" }],
      styles: [
        {
          breakpointId: "base",
          styleSourceId: "template-local",
          property: "color",
          value: { type: "keyword", value: "red" },
        },
      ],
    };
    const authoredTemplate = document.children[0];
    if (authoredTemplate?.type !== "template") {
      throw new Error("Expected authored template");
    }
    const root = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization: {
        templates: [
          {
            type: "resolved-template",
            reference: {
              type: "resolved-template",
              path: [0],
              templateName: "Card",
              templateInstanceId: "card-template",
              props: authoredTemplate.props,
            },
            fragment: templateFragment,
            editablePropNames: ["tone"],
            jsxPropContext: {
              ...htmlJsxPropContext,
              componentPropNames: ["tone", "legacy"],
            },
            propNameMappings: [
              { jsxPropName: "tone", instancePropName: "tone" },
              { jsxPropName: "legacy", instancePropName: "legacy" },
            ],
            ignoredJsxPropNames: ["legacy"],
          },
        ],
        diagnostics: [
          {
            code: "ignored-template-prop",
            severity: "warning",
            blockInstanceId: "block",
            assetId: "article",
            contentRef: "posts/article.mdx",
            renderScope: "page:/article",
            templateName: "Card",
            propName: "legacy",
            reason: "stale",
          },
        ],
        dependencies: { templateNames: ["Card"], templates: [] },
      },
    });
    const next = structuredClone(root.fragment);
    const tone = next.props.find(({ id }) => id === "tone");
    if (tone?.type !== "string") {
      throw new Error("Expected tone prop");
    }
    tone.value = "loud";

    expect(
      reconcileMdxAuthoredContent({ root, fragment: next }).children[0]
    ).toMatchObject({
      type: "template",
      name: "Card",
      props: [
        { name: "tone", value: "loud" },
        { name: "legacy", value: "authored" },
      ],
    });

    next.instances.find(({ id }) => id === "template-heading")!.children = [
      { type: "text", value: "Changed internal" },
    ];
    expect(() => reconcileMdxAuthoredContent({ root, fragment: next })).toThrow(
      "Expanded template internals"
    );

    expect(
      reconcileMdxAuthoredContent({
        root,
        fragment: {
          ...root.fragment,
          children: [],
          instances: [],
          props: [],
          breakpoints: [],
          styleSourceSelections: [],
          styleSources: [],
          styles: [],
        },
      }).children
    ).toEqual([]);
  });

  test("canonicalizes a legacy JSX prop name during serialization", async () => {
    const document = await parseMdxDocument({
      source: '<ws.element ws:name="Card" class="old" />',
    });
    const authoredTemplate = document.children[0];
    if (authoredTemplate?.type !== "template") {
      throw new Error("Expected authored template");
    }
    const root = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization: {
        templates: [
          {
            type: "resolved-template",
            reference: {
              type: "resolved-template",
              path: [0],
              templateName: "Card",
              templateInstanceId: "card-template",
              props: authoredTemplate.props,
            },
            fragment: {
              children: [{ type: "id", value: "card" }],
              instances: [
                {
                  type: "instance",
                  id: "card",
                  component: "Card",
                  children: [],
                },
              ],
              props: [
                {
                  id: "card:class",
                  instanceId: "card",
                  name: "class",
                  type: "string",
                  value: "old",
                },
              ],
              assets: [],
              dataSources: [],
              resources: [],
              breakpoints: [],
              styleSourceSelections: [],
              styleSources: [],
              styles: [],
            },
            editablePropNames: ["class"],
            jsxPropContext: htmlJsxPropContext,
            propNameMappings: [
              { jsxPropName: "class", instancePropName: "class" },
            ],
            ignoredJsxPropNames: [],
          },
        ],
        diagnostics: [],
        dependencies: { templateNames: ["Card"], templates: [] },
      },
    });
    const next = structuredClone(root.fragment);
    const classProp = next.props[0];
    if (classProp?.type !== "string") {
      throw new Error("Expected class prop");
    }
    classProp.value = "new";

    expect(await serializeMdxAuthoredContent({ root, fragment: next })).toBe(
      '<ws.element ws:name="Card" className="new" />\n'
    );
  });

  test("persists a new arbitrary static prop with its canonical JSX name", async () => {
    const document = await parseMdxDocument({
      source: '<ws.element ws:name="Card" />',
    });
    const authoredTemplate = document.children[0];
    if (authoredTemplate?.type !== "template") {
      throw new Error("Expected authored template");
    }
    const root = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization: {
        templates: [
          {
            type: "resolved-template",
            reference: {
              type: "resolved-template",
              path: [0],
              templateName: "Card",
              templateInstanceId: "card-template",
              props: [],
            },
            fragment: {
              children: [{ type: "id", value: "card" }],
              instances: [
                {
                  type: "instance",
                  id: "card",
                  component: "Card",
                  tag: "div",
                  children: [],
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
            editablePropNames: [],
            jsxPropContext: htmlJsxPropContext,
            propNameMappings: [],
            ignoredJsxPropNames: [],
          },
        ],
        diagnostics: [],
        dependencies: { templateNames: ["Card"], templates: [] },
      },
    });
    const next = structuredClone(root.fragment);
    next.props.push({
      id: "card:class",
      instanceId: next.instances[0]!.id,
      name: "class",
      type: "string",
      value: "new",
    });

    expect(await serializeMdxAuthoredContent({ root, fragment: next })).toBe(
      '<ws.element ws:name="Card" className="new" />\n'
    );

    const invalid = structuredClone(root.fragment);
    invalid.props.push({
      id: "card:class",
      instanceId: invalid.instances[0]!.id,
      name: "class",
      type: "number",
      value: 1,
    });
    await expect(
      serializeMdxAuthoredContent({ root, fragment: invalid })
    ).rejects.toThrow(
      "Expanded template props cannot be represented losslessly in MDX"
    );
  });

  test("rejects props that collide after JSX name conversion", async () => {
    const fragment = createCodeTextFragment();
    const instanceId = fragment.instances[0]!.id;
    fragment.props.push(
      {
        id: "code-class",
        instanceId,
        name: "class",
        type: "string",
        value: "standard",
      },
      {
        id: "code-class-name",
        instanceId,
        name: "className",
        type: "string",
        value: "custom",
      }
    );

    await expect(
      serializeMdxTemplateInsertion({
        identity,
        fragment,
        templateName: "CodeText",
      })
    ).rejects.toThrow('Multiple properties map to "className"');
  });

  test("persists direct text edits on a template root", async () => {
    const document = await parseMdxDocument({
      source: `<ws.element ws:name="Heading" />`,
    });
    const authoredTemplate = document.children[0];
    if (authoredTemplate?.type !== "template") {
      throw new Error("Expected authored template");
    }
    const templateFragment: WebstudioFragment = {
      children: [{ type: "id", value: "template-heading" }],
      instances: [
        {
          type: "instance",
          id: "template-heading",
          component: elementComponent,
          tag: "h2",
          children: [{ type: "text", value: "Default heading" }],
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
    };
    const templateMaterialization = {
      templates: [
        {
          type: "resolved-template" as const,
          reference: {
            type: "resolved-template" as const,
            path: [0],
            templateName: "Heading",
            templateInstanceId: "heading-template",
            props: authoredTemplate.props,
          },
          fragment: templateFragment,
          editablePropNames: [],
          jsxPropContext: htmlJsxPropContext,
          propNameMappings: [],
          ignoredJsxPropNames: [],
        },
      ],
      diagnostics: [],
      dependencies: { templateNames: ["Heading"], templates: [] },
    };
    const root = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization,
    });
    const next = structuredClone(root.fragment);
    next.instances[0]!.children = [{ type: "text", value: "Authored heading" }];

    const nextDocument = reconcileMdxAuthoredContent({
      root,
      fragment: next,
    });
    expect(nextDocument.children[0]).toMatchObject({
      type: "template",
      name: "Heading",
      children: [{ type: "text", value: "Authored heading" }],
    });
    const persistedDocument = await parseMdxDocument({
      source: serializeMdxDocument(nextDocument),
    });

    const rematerialized = materializeMdxAuthoredContent({
      identity,
      document: persistedDocument,
      templateMaterialization,
    });
    expect(rematerialized.fragment.instances[0]?.children).toEqual([
      { type: "text", value: "Authored heading" },
    ]);
  });
});
