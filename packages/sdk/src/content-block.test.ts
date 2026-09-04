import { describe, expect, test } from "vitest";
import {
  blockComponent,
  blockBodyComponent,
  blockTemplateComponent,
  coreMetas,
} from "./core-metas";
import type { FileAsset } from "./schema/assets";
import type { Instance } from "./schema/instances";
import type { Prop } from "./schema/props";
import {
  allocateUniqueContentBlockTemplateName,
  findContentBlockBodyContainerPaths,
  findContentBlockTemplateContainers,
  getWritableContentBlockDocumentBinding,
  findWritableContentBlockDocumentBindings,
  getContentBlockSourceIntegrityIssues,
  getDefaultContentBlockTemplateName,
  getContentBlockMdxTemplateDescriptor,
  isEqualContentBlockSource,
  isContentBlockMdxTemplateInsertable,
  parseContentBlockSourceProp,
} from "./content-block";
import { encodeDataSourceVariable } from "./expression";

test("declares the Content Block source as a Design-mode MDX property", () => {
  expect(coreMetas[blockComponent]).toMatchObject({
    initialProps: ["src"],
    props: {
      src: {
        type: "string",
        control: "file",
        label: "Source",
        description:
          "Create an .mdx file in Assets, then select or bind it here.",
        accept: ".mdx",
        contentMode: false,
      },
    },
  });
});

const block: Instance = {
  type: "instance",
  id: "block",
  component: blockComponent,
  children: [],
};

const sourceProp = (values: Partial<Prop> = {}): Prop =>
  ({
    id: "source-prop",
    instanceId: block.id,
    name: "src",
    type: "asset",
    value: "post",
    ...values,
  }) as Prop;

const mdxAsset: FileAsset = {
  id: "post",
  projectId: "project",
  type: "file",
  name: "post_hash.mdx",
  filename: "post",
  format: "mdx",
  size: 1,
  meta: {},
  description: null,
  createdAt: "2026-08-14T00:00:00.000Z",
};

describe("Content Block MDX template semantics", () => {
  test("derives identity from the component or intrinsic tag, never its label", () => {
    expect(
      getDefaultContentBlockTemplateName({ component: "Heading", tag: "h1" })
    ).toBe("Heading");
    expect(
      getDefaultContentBlockTemplateName({
        component: "ws:element",
        tag: "h1",
      })
    ).toBe("H1");
    expect(
      getDefaultContentBlockTemplateName({ component: "radix:Checkbox" }, [
        "Checkbox",
        "radix:Checkbox",
      ])
    ).toBe("RadixCheckbox");
  });

  test("matches element semantics by rendered tag across component types", () => {
    expect(
      getContentBlockMdxTemplateDescriptor({
        component: "Heading",
        tag: "h2",
      })
    ).toEqual({
      kind: "element",
      resolutionKey: "element:h2",
      label: "Heading 2",
      tag: "h2",
      insertable: true,
    });
  });

  test("keeps custom templates insertable while hiding structural semantics", () => {
    expect(
      isContentBlockMdxTemplateInsertable({
        component: "Element",
        tag: "td",
      })
    ).toBe(false);
    expect(
      isContentBlockMdxTemplateInsertable({ component: "CustomCard" })
    ).toBe(true);
  });
});

describe("Content Block source", () => {
  test("finds every Templates container without hiding invalid duplicates", () => {
    const first: Instance = {
      type: "instance",
      id: "templates-1",
      component: blockTemplateComponent,
      children: [],
    };
    const second: Instance = { ...first, id: "templates-2" };
    const other: Instance = {
      type: "instance",
      id: "other",
      component: "ws:element",
      tag: "div",
      children: [],
    };
    const contentBlock = {
      ...block,
      children: [first, other, second].map(({ id }) => ({
        type: "id" as const,
        value: id,
      })),
    };
    const instances = new Map(
      [contentBlock, first, other, second].map((instance) => [
        instance.id,
        instance,
      ])
    );

    expect(
      findContentBlockTemplateContainers({
        blockInstance: contentBlock,
        instances,
      })
    ).toEqual([first, second]);
  });

  test("finds a Body outlet nested in the designed shell", () => {
    const body: Instance = {
      type: "instance",
      id: "body",
      component: blockBodyComponent,
      children: [],
    };
    const shell: Instance = {
      type: "instance",
      id: "shell",
      component: "ws:element",
      tag: "article",
      children: [{ type: "id", value: body.id }],
    };
    const contentBlock: Instance = {
      ...block,
      children: [{ type: "id", value: shell.id }],
    };
    const instances = new Map(
      [contentBlock, shell, body].map((instance) => [instance.id, instance])
    );

    expect(
      findContentBlockBodyContainerPaths({
        blockInstance: contentBlock,
        instances,
      })
    ).toEqual([[shell, body]]);
  });

  test("recognizes only direct document frontmatter bindings", () => {
    const document = encodeDataSourceVariable("document-id");
    expect(
      getWritableContentBlockDocumentBinding({
        binding: {
          type: "expression",
          value: `${document}.frontmatter.author.name`,
          mode: "readwrite",
        },
        documentDataSourceId: "document-id",
      })
    ).toEqual({
      type: "writable-content-block-document-binding",
      expression: {
        type: "direct-path",
        expression: `${document}.frontmatter.author.name`,
        path: [document, "frontmatter", "author", "name"],
      },
      frontmatterPath: ["author", "name"],
    });
    expect(
      getWritableContentBlockDocumentBinding({
        binding: {
          type: "expression",
          value: `${document}.frontmatter.title ?? "Untitled"`,
          mode: "readwrite",
        },
        documentDataSourceId: "document-id",
      })
    ).toBeUndefined();
    expect(
      getWritableContentBlockDocumentBinding({
        binding: {
          type: "expression",
          value: `${document}.frontmatter.title`,
        },
        documentDataSourceId: "document-id",
      })
    ).toBeUndefined();
    expect(
      getWritableContentBlockDocumentBinding({
        binding: {
          type: "expression",
          value: `${document}.frontmatter["__proto__"].polluted`,
          mode: "readwrite",
        },
        documentDataSourceId: "document-id",
      })
    ).toBeUndefined();
  });

  test("finds direct document bindings inside a connected Content Block", () => {
    const document = encodeDataSourceVariable("document-id");
    const title: Instance = {
      type: "instance",
      id: "title",
      component: "Heading",
      children: [
        {
          type: "expression",
          value: `${document}.frontmatter.title`,
          mode: "readwrite",
        },
      ],
    };
    const contentBlock: Instance = {
      ...block,
      children: [{ type: "id", value: title.id }],
    };
    const titleProp: Prop = {
      id: "title-prop",
      instanceId: title.id,
      name: "aria-label",
      type: "expression",
      value: `${document}.frontmatter.title`,
      mode: "readwrite",
    };
    const instances = new Map(
      [contentBlock, title].map((instance) => [instance.id, instance])
    );
    const props = new Map<string, Prop>([
      ["source", sourceProp()],
      [
        "document",
        {
          id: "document",
          instanceId: block.id,
          name: "document",
          type: "parameter",
          value: "document-id",
        },
      ],
      [titleProp.id, titleProp],
    ]);

    expect(
      findWritableContentBlockDocumentBindings({ instances, props })
    ).toEqual({
      children: [
        expect.objectContaining({ instanceId: title.id, childIndex: 0 }),
      ],
      props: [expect.objectContaining({ propId: titleProp.id })],
    });
  });

  test("keeps the source optional for existing Content Blocks", () => {
    expect(
      getContentBlockSourceIntegrityIssues({
        instances: [block],
        props: [],
        assets: [],
      })
    ).toEqual([]);
  });

  test("maps persisted Asset and expression props to the source contract", () => {
    expect(parseContentBlockSourceProp(sourceProp())).toEqual({
      type: "asset",
      assetId: "post",
    });
    expect(
      parseContentBlockSourceProp(
        sourceProp({ type: "expression", value: "post.body" })
      )
    ).toEqual({ type: "expression", value: "post.body" });
    expect(
      parseContentBlockSourceProp(sourceProp({ type: "string", value: "post" }))
    ).toBeUndefined();
  });

  test("compares source bindings by their persisted identity", () => {
    expect(isEqualContentBlockSource(undefined, undefined)).toBe(true);
    expect(
      isEqualContentBlockSource(
        { type: "asset", assetId: "post" },
        { type: "asset", assetId: "post" }
      )
    ).toBe(true);
    expect(
      isEqualContentBlockSource(
        { type: "expression", value: "post.body" },
        { type: "expression", value: "post.body" }
      )
    ).toBe(true);
    expect(
      isEqualContentBlockSource(
        { type: "asset", assetId: "post" },
        { type: "expression", value: "post" }
      )
    ).toBe(false);
  });

  test("diagnoses duplicate, invalid, missing, and incompatible sources", () => {
    expect(
      getContentBlockSourceIntegrityIssues({
        instances: [block],
        props: [sourceProp(), sourceProp({ id: "other-source" })],
        assets: [mdxAsset],
      })
    ).toEqual([
      {
        type: "duplicateContentBlockSource",
        blockInstanceId: "block",
        propIds: ["source-prop", "other-source"],
      },
    ]);
    expect(
      getContentBlockSourceIntegrityIssues({
        instances: [block],
        props: [sourceProp({ type: "string" })],
        assets: [mdxAsset],
      })
    ).toEqual([
      {
        type: "invalidContentBlockSource",
        blockInstanceId: "block",
        propId: "source-prop",
        propType: "string",
      },
    ]);
    expect(
      getContentBlockSourceIntegrityIssues({
        instances: [block],
        props: [sourceProp()],
        assets: [],
      })
    ).toEqual([
      {
        type: "missingContentBlockSourceAsset",
        blockInstanceId: "block",
        propId: "source-prop",
        assetId: "post",
      },
    ]);
    expect(
      getContentBlockSourceIntegrityIssues({
        instances: [block],
        props: [sourceProp()],
        assets: [{ ...mdxAsset, name: "post_hash.md", format: "md" }],
      })
    ).toEqual([
      {
        type: "incompatibleContentBlockSourceAsset",
        blockInstanceId: "block",
        propId: "source-prop",
        assetId: "post",
        assetName: "post_hash.md",
      },
    ]);
    expect(
      getContentBlockSourceIntegrityIssues({
        instances: [block],
        props: [sourceProp()],
        assets: [mdxAsset],
      })
    ).toEqual([]);
  });
});

describe("allocateUniqueContentBlockTemplateName", () => {
  test.each([
    ["Card", [], "Card"],
    ["promotion card", [], "PromotionCard"],
    ["Card", ["Card"], "Card2"],
    ["Card", ["Card", "Card2"], "Card3"],
    ["Card", ["Card", "Card3"], "Card2"],
    ["Card2", ["Card2", "Card3"], "Card4"],
    ["Héro 🦸", [], "Hero"],
    ["", [], "Template"],
  ])(
    "allocates the canonical identifier %s",
    (name, existingNames, expected) => {
      const names = new Set(existingNames);

      expect(
        allocateUniqueContentBlockTemplateName({
          name,
          existingNames: names,
        })
      ).toBe(expected);
      expect(names).toEqual(new Set(existingNames));
    }
  );
});
