import { describe, expect, test } from "vitest";
import baseComponentRegistry from "@webstudio-is/sdk-components-react/registry";
import radixComponentRegistry from "@webstudio-is/sdk-components-react-radix/registry";
import {
  getComponentMetasFromRegistry,
  getNamespacedComponentMetasFromRegistry,
  getPackageNamespacedComponentMetasFromRegistry,
  getPackageNamespaceFromRegistry,
} from "./component-registry";

describe("component registry", () => {
  test("hydrates Builder component metas from registry items", () => {
    const metas = getComponentMetasFromRegistry(baseComponentRegistry);

    expect(metas.has("Box")).toBe(true);
    expect(metas.get("Box")?.presetStyle).toBeDefined();
    expect(metas.get("Input")?.label).toBe("Text Input");
    expect(metas.get("ContentEmbed")).toBeUndefined();
  });

  test("hydrates namespaced package component metas", () => {
    const metas = getNamespacedComponentMetasFromRegistry({
      namespace: "@webstudio-is/sdk-components-react-radix",
      registry: radixComponentRegistry,
    });

    expect(
      metas.has("@webstudio-is/sdk-components-react-radix:Accordion")
    ).toBe(true);
    expect(metas.has("Accordion")).toBe(false);
    expect(
      metas.get("@webstudio-is/sdk-components-react-radix:Accordion")?.icon
    ).toBeDefined();
  });

  test("derives package namespace from registry source metadata", () => {
    expect(getPackageNamespaceFromRegistry(radixComponentRegistry)).toBe(
      "@webstudio-is/sdk-components-react-radix"
    );

    const metas = getPackageNamespacedComponentMetasFromRegistry(
      radixComponentRegistry
    );

    expect(
      metas.has("@webstudio-is/sdk-components-react-radix:Accordion")
    ).toBe(true);
    expect(metas.has("Accordion")).toBe(false);
  });

  test("does not infer a package namespace from mixed source registries", () => {
    expect(
      getPackageNamespaceFromRegistry({
        items: [
          {
            meta: {
              source: { package: "@webstudio-is/one" },
              component: "One",
            },
          },
          {
            meta: {
              source: { package: "@webstudio-is/two" },
              component: "Two",
            },
          },
        ],
      })
    ).toBeUndefined();
  });
});
