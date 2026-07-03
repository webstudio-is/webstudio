import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { WsComponentMeta } from "@webstudio-is/sdk";
import type { TemplateMeta } from "@webstudio-is/template";
import { describe, expect, test } from "vitest";
import { buildRegistryArtifacts } from "./generate-registry";
import { webstudioRegistrySchema } from "./registry-schema";

const packageJson = {
  name: "@webstudio-is/sdk-components-react-radix",
  homepage: "https://webstudio.is",
};

const createTemplate = (
  meta: Omit<TemplateMeta, "template">
): TemplateMeta => ({
  ...meta,
  template: {} as TemplateMeta["template"],
});

describe("buildRegistryArtifacts", () => {
  test("creates a shadcn-compatible registry with Webstudio metadata", () => {
    const metas = new Map<string, WsComponentMeta>([
      [
        "Accordion",
        {
          label: "Accordion",
          description: "Collapsible content sections.",
          icon: "<svg />",
          presetStyle: { div: [] },
          initialProps: ["value"],
          contentModel: {
            category: "instance",
            children: ["instance"],
            descendants: [
              "@webstudio-is/sdk-components-react-radix:AccordionItem",
            ],
          },
          props: {
            value: {
              required: false,
              control: "text",
              type: "string",
              description: "Open item value.",
            },
          },
        },
      ],
      [
        "AccordionItem",
        {
          label: "Item",
          contentModel: {
            category: "none",
            children: ["instance"],
          },
        },
      ],
    ]);
    const templates = new Map<string, TemplateMeta>([
      [
        "Accordion",
        createTemplate({
          category: "radix",
          description: "Canonical accordion starter.",
        }),
      ],
    ]);

    const { registry, docs } = buildRegistryArtifacts({
      packageJson,
      metas,
      templates,
    });

    expect(() => webstudioRegistrySchema.parse(registry)).not.toThrow();
    expect(registry).toMatchObject({
      $schema: "https://ui.shadcn.com/schema/registry.json",
      name: "webstudio-is-sdk-components-react-radix",
      homepage: "https://webstudio.is",
    });
    expect(registry.items).toEqual([
      expect.objectContaining({
        $schema: "https://ui.shadcn.com/schema/registry-item.json",
        name: "accordion",
        type: "registry:ui",
        title: "Accordion",
        description: "Collapsible content sections.",
        meta: expect.objectContaining({
          docs: "docs/accordion.mdx",
          component: "Accordion",
          label: "Accordion",
          description: "Collapsible content sections.",
          icon: "<svg />",
          presetStyle: { div: [] },
          source: {
            package: "@webstudio-is/sdk-components-react-radix",
            export: "Accordion",
            kind: "component",
          },
          composition: {
            family: "Accordion",
            role: "root",
            tree: expect.stringContaining("AccordionItem"),
          },
          template: {
            name: "Accordion",
            title: "Accordion",
            description: "Canonical accordion starter.",
            category: "radix",
          },
        }),
      }),
      expect.objectContaining({
        name: "accordion-item",
        type: "registry:ui",
        meta: expect.objectContaining({
          component: "AccordionItem",
          composition: {
            family: "Accordion",
            role: "part",
          },
        }),
      }),
    ]);
    expect(registry.items[0]).not.toHaveProperty("docs");
    expect(registry.items[0]).not.toHaveProperty("component");

    const accordionDocs = docs.get("docs/accordion.mdx");
    expect(accordionDocs).toContain('title: "Accordion"');
    expect(accordionDocs).toContain('base: "radix"');
    expect(accordionDocs).toContain("## Installation");
    expect(accordionDocs).toContain("## Usage");
    expect(accordionDocs).toContain("## Composition");
    expect(accordionDocs).toContain("`-- AccordionItem");
    expect(accordionDocs).toContain("## Examples");
    expect(accordionDocs).toContain("## API Reference");
    expect(accordionDocs).toContain("### Props");
    expect(accordionDocs).toContain("`value`");
    expect(accordionDocs).toContain("## Accessibility");
    expect(accordionDocs).toContain("## References");
    expect(accordionDocs).toContain(
      "https://www.radix-ui.com/primitives/docs/components/accordion"
    );
  });

  test("documents compound parts as parts and does not duplicate matching templates", () => {
    const metas = new Map<string, WsComponentMeta>([
      [
        "Accordion",
        {
          contentModel: {
            category: "instance",
            children: ["instance"],
            descendants: [
              "@webstudio-is/sdk-components-react-radix:AccordionItem",
            ],
          },
        },
      ],
      ["AccordionItem", { label: "Item" }],
    ]);
    const templates = new Map<string, TemplateMeta>([
      [
        "AccordionItem",
        createTemplate({
          category: "radix",
          description: "Should only enrich the component item.",
        }),
      ],
    ]);

    const { registry, docs } = buildRegistryArtifacts({
      packageJson,
      metas,
      templates,
    });

    expect(registry.items).toHaveLength(2);
    expect(
      registry.items.find((item) => item.name === "accordion-item")
    ).toMatchObject({
      name: "accordion-item",
      type: "registry:ui",
      meta: {
        component: "AccordionItem",
        composition: {
          family: "Accordion",
          role: "part",
        },
        template: {
          name: "AccordionItem",
        },
      },
    });
    expect(docs.get("docs/accordion-item.mdx")).toContain(
      "Do not insert it without the required surrounding composition."
    );
    expect(docs.get("docs/accordion-item.mdx")).toContain(
      "Use this component only as part of the `Accordion` family."
    );
    expect(docs.get("docs/accordion-item.mdx")).not.toContain(
      "This component is used as a standalone component"
    );
  });

  test("derives composition from content models", () => {
    const { registry, docs } = buildRegistryArtifacts({
      packageJson: {
        name: "@webstudio-is/sdk-components-react",
        homepage: "https://webstudio.is",
      },
      metas: new Map<string, WsComponentMeta>([
        [
          "Menu",
          {
            contentModel: {
              category: "instance",
              children: ["instance"],
              descendants: ["MenuList"],
            },
          },
        ],
        [
          "MenuList",
          {
            contentModel: {
              category: "none",
              children: ["MenuItem"],
            },
          },
        ],
        [
          "MenuItem",
          {
            contentModel: {
              category: "none",
              children: ["rich-text"],
            },
          },
        ],
      ]),
      templates: new Map(),
    });

    const menuItem = registry.items.find((item) => item.name === "menu");
    const nestedMenuItem = registry.items.find(
      (item) => item.name === "menu-item"
    );
    expect(menuItem).toBeDefined();
    expect(nestedMenuItem).toBeDefined();

    expect(menuItem?.meta?.composition).toEqual({
      family: "Menu",
      role: "root",
      tree: "Menu\n`-- MenuList\n    `-- MenuItem",
    });
    expect(nestedMenuItem?.meta?.composition).toEqual({
      family: "Menu",
      role: "part",
    });
    expect(docs.get("docs/menu.mdx")).toContain(
      "Menu\n`-- MenuList\n    `-- MenuItem"
    );
  });

  test("emits template-only exports as block items", () => {
    const { registry, docs } = buildRegistryArtifacts({
      packageJson,
      metas: new Map(),
      templates: new Map([
        [
          "Sheet",
          createTemplate({
            category: "radix",
            description: "Slide-out panel template.",
          }),
        ],
      ]),
    });

    expect(registry.items).toEqual([
      expect.objectContaining({
        name: "sheet",
        type: "registry:block",
        title: "Sheet",
        description: "Slide-out panel template.",
        meta: expect.objectContaining({
          docs: "docs/sheet.mdx",
          source: {
            package: "@webstudio-is/sdk-components-react-radix",
            export: "Sheet",
            kind: "template",
          },
          template: {
            name: "Sheet",
            category: "radix",
            description: "Slide-out panel template.",
          },
        }),
      }),
    ]);
    expect(docs.get("docs/sheet.mdx")).toContain("component: false");
    expect(docs.get("docs/sheet.mdx")).toContain(
      "No external references are currently mapped for this component."
    );
  });

  test("does not apply Radix references to same-name base components", () => {
    const { docs } = buildRegistryArtifacts({
      packageJson: {
        name: "@webstudio-is/sdk-components-react",
        homepage: "https://webstudio.is",
      },
      metas: new Map<string, WsComponentMeta>([
        ["Select", { label: "Select" }],
      ]),
      templates: new Map(),
    });

    const selectDocs = docs.get("docs/select.mdx");
    expect(selectDocs).toContain("Follow Webstudio's semantic component model");
    expect(selectDocs).not.toContain(
      "https://www.radix-ui.com/primitives/docs/components/select"
    );
  });

  test("derives Radix references from component names", () => {
    const { docs } = buildRegistryArtifacts({
      packageJson,
      metas: new Map<string, WsComponentMeta>([
        ["NavigationMenu", { label: "Navigation Menu" }],
      ]),
      templates: new Map([
        [
          "NavigationMenu",
          createTemplate({
            category: "radix",
            description: "Navigation menu.",
          }),
        ],
      ]),
    });

    expect(docs.get("docs/navigation-menu.mdx")).toContain(
      "https://www.radix-ui.com/primitives/docs/components/navigation-menu"
    );
  });

  test("rejects registry items without Webstudio component or template metadata", () => {
    const result = webstudioRegistrySchema.safeParse({
      $schema: "https://ui.shadcn.com/schema/registry.json",
      name: "webstudio-is-sdk-components-react",
      homepage: "https://webstudio.is",
      items: [
        {
          $schema: "https://ui.shadcn.com/schema/registry-item.json",
          name: "box",
          type: "registry:ui",
          title: "Box",
          description: "Box component.",
          meta: {
            docs: "docs/box.mdx",
            source: {
              package: "@webstudio-is/sdk-components-react",
              export: "Box",
              kind: "component",
            },
          },
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "Registry item meta must define a component or template"
    );
  });

  test("rejects registry items with invalid Webstudio component metadata", () => {
    const result = webstudioRegistrySchema.safeParse({
      $schema: "https://ui.shadcn.com/schema/registry.json",
      name: "webstudio-is-sdk-components-react",
      homepage: "https://webstudio.is",
      items: [
        {
          $schema: "https://ui.shadcn.com/schema/registry-item.json",
          name: "box",
          type: "registry:ui",
          title: "Box",
          description: "Box component.",
          meta: {
            docs: "docs/box.mdx",
            source: {
              package: "@webstudio-is/sdk-components-react",
              export: "Box",
              kind: "component",
            },
            component: "Box",
            contentModel: {
              category: "invalid",
              children: ["instance"],
            },
          },
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});

describe("generated SDK component registries", () => {
  const generatedPackages = [
    "../../sdk-components-react/src/__generated__",
    "../../sdk-components-react-radix/src/__generated__",
    "../../sdk-components-animation/src/__generated__",
  ];

  test.each(generatedPackages)(
    "%s generates one shadcn-compatible registry and docs",
    async (dir) => {
      const outputDir = resolve(import.meta.dirname, dir);
      const registry = JSON.parse(
        await readFile(resolve(outputDir, "registry.json"), "utf8")
      );
      const parsedRegistry = webstudioRegistrySchema.parse(registry);

      expect(existsSync(resolve(outputDir, "component-registry.json"))).toBe(
        false
      );
      expect(parsedRegistry.items.length).toBeGreaterThan(0);
      const itemNames = new Set<string>();
      for (const item of parsedRegistry.items) {
        expect(itemNames.has(item.name), `duplicate item ${item.name}`).toBe(
          false
        );
        itemNames.add(item.name);
        expect(item).not.toHaveProperty("docs");
        expect(item.meta?.docs, item.name).toMatch(/^docs\/.+\.mdx$/);
        expect(item.meta?.source, item.name).toBeDefined();
        expect(
          item.meta?.component ?? item.meta?.template,
          item.name
        ).toBeDefined();
        const docsPath = resolve(outputDir, item.meta?.docs as string);
        expect(existsSync(docsPath)).toBe(true);
        const docs = await readFile(docsPath, "utf8");
        expect(docs, item.name).toContain("---\n");
        expect(docs, item.name).toContain("sourcePackage:");
        expect(docs, item.name).toContain("sourceExport:");
      }
    }
  );
});
