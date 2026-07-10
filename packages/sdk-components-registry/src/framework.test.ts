import { expect, test } from "vitest";
import {
  baseComponentImportSource,
  createFrameworkComponentRegistry,
} from "./framework";
import { componentMetaLibraries, getComponentName } from "./shared";

test("creates framework component imports from component package metas", () => {
  const registry = createFrameworkComponentRegistry();

  for (const library of componentMetaLibraries) {
    for (const [name, meta] of Object.entries(library.metas)) {
      const component = getComponentName(library, name);
      expect(registry.components[component]).toBe(
        `${library.importSource}:${name}`
      );
      expect(registry.metas[component]).toBe(meta);
    }
  }
});

test("overrides router components only when a framework provides them", () => {
  expect(createFrameworkComponentRegistry().components.Link).toBe(
    `${baseComponentImportSource}:Link`
  );

  const registry = createFrameworkComponentRegistry({
    routerComponents: { Link: {}, routeHelper: {} },
    routerComponentPackage: "@webstudio-is/sdk-components-react-router",
  });
  expect(registry.components.Link).toBe(
    "@webstudio-is/sdk-components-react-router:Link"
  );
  expect(registry.components.routeHelper).toBeUndefined();
});
