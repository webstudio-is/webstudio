import { describe, expect, test } from "vitest";
import { collectionComponent } from "@webstudio-is/sdk";
import {
  type ComponentCatalogMeta,
  type ComponentCatalogTemplate,
  createComponentRegistry,
  getComponentCatalogSortScore,
  getComponentRegistryTemplateFilePath,
  compareComponentCatalogItems,
  isComponentAvailableForDocumentType,
  isComponentHiddenFromCatalog,
  listBuilderComponentPanelItems,
  listComponentCatalogAvailableComponents,
  listComponentCatalogItems,
  listComponentRegistryItems,
} from "./component-catalog";
import { createEmptyWebstudioFragment } from "./component-template";

describe("component catalog", () => {
  test("hides uncategorized structural components unless they have content model", () => {
    expect(isComponentHiddenFromCatalog({})).toBe(true);
    expect(
      isComponentHiddenFromCatalog({
        contentModel: { category: "instance", children: ["instance"] },
      })
    ).toBe(false);
  });

  test("keeps non-standalone parts discoverable for coverage", () => {
    expect(
      isComponentHiddenFromCatalog({
        contentModel: { category: "none", children: [] },
      })
    ).toBe(false);
  });

  test("supports explicit internal component visibility", () => {
    expect(isComponentHiddenFromCatalog({ category: "internal" })).toBe(true);
    expect(
      isComponentHiddenFromCatalog({ category: "internal" }, "internal", {
        showInternal: true,
      })
    ).toBe(false);
  });

  test("uses the same document type availability for UI and runtime", () => {
    expect(
      isComponentAvailableForDocumentType({
        component: "Box",
        category: "general",
        documentType: "html",
      })
    ).toBe(true);
    expect(
      isComponentAvailableForDocumentType({
        component: "XmlNode",
        category: "xml",
        documentType: "html",
      })
    ).toBe(false);
    expect(
      isComponentAvailableForDocumentType({
        component: "XmlNode",
        category: "xml",
        documentType: "xml",
      })
    ).toBe(true);
    expect(
      isComponentAvailableForDocumentType({
        component: collectionComponent,
        category: "data",
        documentType: "xml",
      })
    ).toBe(true);
    expect(
      isComponentAvailableForDocumentType({
        component: "Box",
        category: "general",
        documentType: "text",
      })
    ).toBe(false);
  });

  test("sorts by category before order", () => {
    expect(
      getComponentCatalogSortScore({ category: "typography", order: 0 })
    ).toBeGreaterThan(
      getComponentCatalogSortScore({ category: "general", order: 999 })
    );
    expect(
      compareComponentCatalogItems(
        { category: "general", order: undefined },
        { category: "media", order: 0 }
      )
    ).toBeLessThan(0);
  });

  test("lists component meta and template entries separately", () => {
    const items = listComponentCatalogItems({
      metas: new Map([
        [
          "Button",
          {
            category: "general",
            label: "Meta Button",
            order: 2,
            contentModel: { category: "instance", children: ["text"] },
          },
        ],
      ]),
      templates: new Map<string, ComponentCatalogTemplate>([
        [
          "Button",
          {
            category: "forms",
            label: "Template Button",
            order: 1,
            template: {
              ...createEmptyWebstudioFragment(),
              instances: [
                {
                  type: "instance",
                  id: "button",
                  component: "Button",
                  children: [],
                },
              ],
              children: [],
            },
          },
        ],
      ]),
    });

    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          catalogId: "meta:Button",
          name: "Button",
          source: "meta",
          category: "general",
          label: "Meta Button",
          order: 2,
          firstInstance: expect.objectContaining({ component: "Button" }),
        }),
        expect.objectContaining({
          catalogId: "template:Button",
          name: "Button",
          source: "template",
          category: "forms",
          label: "Template Button",
          order: 1,
          firstInstance: expect.objectContaining({ component: "Button" }),
        }),
      ])
    );
    expect(items).toHaveLength(2);
  });

  test("exposes components and templates as shadcn-compatible registry items", () => {
    const items = listComponentRegistryItems({
      metas: new Map([
        [
          "Button",
          {
            category: "general",
            label: "Button",
            description: "Clickable action",
            contentModel: { category: "instance", children: ["text"] },
            props: {
              "aria-label": {
                type: "string",
                control: "text",
                required: false,
              },
              alt: {
                type: "string",
                control: "text",
                required: false,
              },
            },
            initialProps: ["aria-label"],
            states: [{ selector: ":hover", label: "Hover" }],
          },
        ],
        [
          "Toolbar",
          {
            category: "hidden",
            label: "Toolbar",
            contentModel: {
              category: "instance",
              children: ["Button"],
              descendants: ["Button"],
            },
          },
        ],
      ]),
      templates: new Map<string, ComponentCatalogTemplate>([
        [
          "LocalTemplateOnly",
          {
            category: "general",
            label: "Local Template",
            description: "Template without a React component export",
            template: {
              ...createEmptyWebstudioFragment(),
              instances: [
                {
                  type: "instance",
                  id: "section",
                  component: "ws:element",
                  tag: "section",
                  children: [
                    { type: "text", value: "Section", placeholder: true },
                  ],
                },
              ],
              children: [],
              styleSources: [{ type: "local", id: "section:local" }],
            },
          },
        ],
      ]),
      sources: new Map([
        [
          "Button",
          {
            exportName: "Button",
            importSource: "@webstudio-is/sdk-components-react/components",
            componentExport: true,
            templateExport: false,
            hooks: false,
            provenance: "sdk",
          },
        ],
        [
          "LocalTemplateOnly",
          {
            exportName: "LocalTemplateOnly",
            componentExport: false,
            templateExport: true,
            hooks: false,
            provenance: "core",
          },
        ],
      ]),
    });
    const templateFilePath =
      getComponentRegistryTemplateFilePath("LocalTemplateOnly");

    expect(items).toEqual([
      expect.objectContaining({
        name: "component:Button",
        title: "Button",
        type: "registry:ui",
        files: [],
        meta: expect.objectContaining({
          catalogId: "meta:Button",
          source: "meta",
          component: "Button",
          insert: expect.objectContaining({
            component: "Button",
            template: false,
          }),
          runtime: expect.objectContaining({
            componentExport: "Button",
            hooks: false,
            category: "general",
            contentModel: { category: "instance", children: ["text"] },
            props: {
              "aria-label": {
                type: "string",
                control: "text",
                required: false,
              },
              alt: {
                type: "string",
                control: "text",
                required: false,
              },
            },
            initialProps: ["aria-label"],
            states: [{ selector: ":hover", label: "Hover" }],
            source: {
              importSource: "@webstudio-is/sdk-components-react/components",
              exportName: "Button",
              provenance: "sdk",
            },
          }),
          authoring: expect.objectContaining({
            role: "Clickable action",
            requiredAncestors: ["Toolbar"],
            allowedParents: ["Toolbar"],
            allowedChildren: ["text"],
            requiredDescendants: [],
            preferredTree: [],
            dos: [
              "Use insert-fragment when composing this component into an authored, styled section.",
              "Style exposed states when creating polished examples: Hover (:hover).",
            ],
            donts: [
              "Do not assume Webstudio will add missing required child parts for raw JSX fragments.",
            ],
            accessibilityNotes: [
              "Provide meaningful alt text for informative media.",
              "Set required ARIA labels/descriptions when visible text is absent.",
            ],
            insertionStrategy: "insert-fragment",
          }),
          builder: expect.objectContaining({
            insertTemplate: false,
            componentPart: false,
            requiredStructure: [],
            expectedNamespaces: ["instances"],
          }),
          examples: [
            {
              name: "insert-component-instance",
              description:
                "Insert this visible component as a single Webstudio instance.",
              tool: "insert-component",
              input: { component: "Button" },
            },
          ],
        }),
      }),
      expect.objectContaining({
        name: "template:LocalTemplateOnly",
        title: "Local Template",
        description: "Template without a React component export",
        type: "registry:ui",
        files: [
          {
            path: templateFilePath,
            target: templateFilePath,
            type: "registry:file",
            content: expect.stringContaining('"component": "ws:element"'),
          },
        ],
        meta: expect.objectContaining({
          catalogId: "template:LocalTemplateOnly",
          source: "template",
          component: "LocalTemplateOnly",
          insert: expect.objectContaining({
            component: "LocalTemplateOnly",
            template: true,
            firstInstance: expect.objectContaining({
              component: "ws:element",
              tag: "section",
            }),
          }),
          runtime: expect.objectContaining({
            componentExport: "LocalTemplateOnly",
            templateExport: "LocalTemplateOnly",
            source: expect.objectContaining({
              exportName: "LocalTemplateOnly",
            }),
          }),
          authoring: expect.objectContaining({
            preferredTree: ["ws:element"],
            examples: ["insert-registered-template"],
            dos: [
              "Use insert-component when you want Webstudio to create this registered template and required child structure.",
            ],
            donts: [],
            insertionStrategy: "insert-component",
          }),
          builder: expect.objectContaining({
            insertTemplate: true,
            requiredStructure: ["ws:element"],
            editablePlaceholders: ["section.children.0"],
            expectedNamespaces: ["instances", "styleSources"],
          }),
          examples: [
            {
              name: "insert-registered-template",
              description:
                "Insert this item with its registered Webstudio template and required child structure.",
              tool: "insert-component",
              input: { component: "LocalTemplateOnly" },
            },
          ],
        }),
      }),
    ]);
    expect(createComponentRegistry({ items })).toEqual({
      $schema: "https://ui.shadcn.com/schema/registry.json",
      name: "webstudio",
      homepage: "https://webstudio.is",
      items,
    });
  });

  test("allows callers to preserve their own meta display labels and icons", () => {
    const items = listComponentCatalogItems({
      metas: new Map([
        [
          "Button",
          {
            category: "general",
            label: "Meta Button",
            icon: "MetaIcon",
          },
        ],
      ]),
      templates: new Map(),
      getMetaLabel: (component) => `Instance ${component}`,
      getMetaIcon: () => undefined,
    });

    expect(items).toEqual([
      expect.objectContaining({
        label: "Instance Button",
        icon: undefined,
      }),
    ]);
  });

  test("lets callers choose template icon fallback behavior", () => {
    const metas = new Map<string, ComponentCatalogMeta>([
      [
        "Button",
        {
          category: "general",
          icon: "MetaIcon",
        },
      ],
    ]);
    const templates = new Map<string, ComponentCatalogTemplate>([
      [
        "Button",
        {
          category: "general",
          template: createEmptyWebstudioFragment(),
        },
      ],
    ]);

    expect(
      listComponentCatalogItems({ metas, templates }).find(
        (item) => item.source === "template"
      )?.icon
    ).toBe("MetaIcon");
    expect(
      listComponentCatalogItems({
        metas,
        templates,
        getTemplateIcon: (_component, template) => template.icon,
      }).find((item) => item.source === "template")?.icon
    ).toBeUndefined();
  });

  test("does not let templates revive hidden or deprecated component metas", () => {
    const metas = new Map<string, ComponentCatalogMeta>([
      [
        "Box",
        {
          deprecated: true,
          label: "Box",
        },
      ],
      [
        "Button",
        {
          label: "Button",
        },
      ],
      [
        "HiddenWidget",
        {
          category: "hidden",
          label: "Hidden Widget",
        },
      ],
    ]);
    const templates = new Map<string, ComponentCatalogTemplate>([
      [
        "Box",
        {
          category: "general",
          template: createEmptyWebstudioFragment(),
        },
      ],
      [
        "Button",
        {
          category: "forms",
          template: createEmptyWebstudioFragment(),
        },
      ],
      [
        "LocalTemplateOnly",
        {
          category: "general",
          template: createEmptyWebstudioFragment(),
        },
      ],
      [
        "HiddenWidget",
        {
          category: "general",
          template: createEmptyWebstudioFragment(),
        },
      ],
    ]);

    expect(
      listComponentCatalogItems({ metas, templates }).map((item) => item.name)
    ).toEqual(["LocalTemplateOnly", "Button"]);
    const panelItemsByCategory = listBuilderComponentPanelItems({
      metas,
      templates,
    });
    expect(
      panelItemsByCategory.get("general")?.map((item) => item.name)
    ).toEqual(["LocalTemplateOnly"]);
    expect(panelItemsByCategory.get("forms")?.map((item) => item.name)).toEqual(
      ["Button"]
    );
    expect(panelItemsByCategory.has("hidden")).toBe(false);
    expect(
      Array.from(panelItemsByCategory.values())
        .flat()
        .map((item) => item.name)
    ).not.toEqual(expect.arrayContaining(["Box", "HiddenWidget"]));
  });

  test("preserves builder components panel raw grouping semantics", () => {
    const metas = new Map<string, ComponentCatalogMeta>([
      [
        "Box",
        {
          category: "general",
          label: "Meta Box",
          description: "Meta description",
          icon: "MetaIcon",
          order: 2,
        },
      ],
      [
        "Body",
        {
          category: "hidden",
          label: "Body",
          order: 0,
        },
      ],
    ]);
    const templates = new Map<string, ComponentCatalogTemplate>([
      [
        "Box",
        {
          category: "general",
          label: "Template Box",
          description: "Template description",
          icon: "TemplateIcon",
          order: 1,
          template: {
            ...createEmptyWebstudioFragment(),
            instances: [
              {
                type: "instance",
                id: "box",
                component: "Box",
                children: [],
              },
            ],
            children: [],
          },
        },
      ],
    ]);

    const itemsByCategory = listBuilderComponentPanelItems({
      metas,
      templates,
      getFallbackLabel: (component) => `Fallback ${component}`,
      getMetaLabel: (component) => `Instance ${component}`,
      getTemplateIcon: (_component, template) => template.icon,
    });

    expect(itemsByCategory.get("general")).toEqual([
      expect.objectContaining({
        name: "Box",
        label: "Template Box",
        icon: "TemplateIcon",
        order: 1,
      }),
      expect.objectContaining({
        name: "Box",
        label: "Instance Box",
        order: 2,
      }),
    ]);
    expect(itemsByCategory.get("general")?.[1]).not.toHaveProperty("icon");
    expect(itemsByCategory.has("hidden")).toBe(false);
  });

  test("filters catalog items by visibility and document type", () => {
    const metas = new Map<string, ComponentCatalogMeta>([
      ["Body", { category: "hidden" }],
      ["XmlNode", { category: "xml" }],
      ["Box", { category: "general" }],
    ]);
    expect(
      listComponentCatalogItems({
        metas,
        templates: new Map(),
        documentType: "html",
      }).map((item) => item.name)
    ).toEqual(["Box"]);
    expect(
      listComponentCatalogItems({
        metas,
        templates: new Map(),
        documentType: "xml",
      }).map((item) => item.name)
    ).toEqual(["XmlNode"]);
  });

  test("keeps hidden categories out of palette-style lists even when content model exists", () => {
    expect(
      listComponentCatalogItems({
        metas: new Map<string, ComponentCatalogMeta>([
          [
            "DialogTitle",
            {
              category: "hidden",
              contentModel: { category: "none", children: [] },
            },
          ],
        ]),
        templates: new Map(),
      })
    ).toEqual([]);
  });

  test("keeps non-standalone parts discoverable through explicit visibility checks", () => {
    expect(
      isComponentHiddenFromCatalog({
        contentModel: { category: "none", children: [] },
      })
    ).toBe(false);
    expect(
      isComponentHiddenFromCatalog({
        category: "hidden",
        contentModel: { category: "none", children: [] },
      })
    ).toBe(true);
  });

  test("lists all available component names without document visibility filtering", () => {
    expect(
      listComponentCatalogAvailableComponents({
        metas: new Map<string, ComponentCatalogMeta>([
          ["Body", { category: "hidden" }],
          ["Box", { category: "general" }],
        ]),
        templates: new Map<string, ComponentCatalogTemplate>([
          [
            "Dialog",
            {
              category: "radix",
              template: createEmptyWebstudioFragment(),
            },
          ],
        ]),
      })
    ).toEqual(new Set(["Body", "Box", "Dialog"]));
  });
});
