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
  reconcileMdxAuthoredContent,
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

describe("MDX authored content", () => {
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
    expect(otherRevision.fragment.instances[0].id).not.toBe(
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
    const code = next.instances.find(({ tag }) => tag === "code");
    if (code === undefined) {
      throw new Error("Expected code instance");
    }
    code.children = [{ type: "text", value: "  const value = 2;\n" }];

    const reconciled = reconcileMdxAuthoredContent({ root, fragment: next });
    const serialized = serializeMdxDocument(reconciled);
    const reparsed = await parseMdxDocument({ source: serialized });
    const rematerialized = materializeMdxAuthoredContent({
      identity,
      document: reparsed,
      templateMaterialization: emptyTemplates,
    });

    expect(rematerialized.fragment.instances.map(({ tag }) => tag)).toEqual(
      root.fragment.instances.map(({ tag }) => tag)
    );
    expect(
      rematerialized.fragment.instances.find(({ tag }) => tag === "code")
        ?.children
    ).toEqual([{ type: "text", value: "  const value = 2;\n" }]);
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
});
