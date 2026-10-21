/** Verifies that Builder template registration resolves imported component objects. */
import { afterEach, expect, test } from "vitest";
import { listBuilderComponentPanelItems } from "@webstudio-is/project-build/runtime";
import { CodeText } from "@webstudio-is/sdk-components-react/components";
import { canvasComponentLibraries } from "@webstudio-is/sdk-components-registry/canvas";
import { componentIds } from "@webstudio-is/sdk-components-registry/components";
import { getInstanceLabel } from "~/builder/shared/instance-label";
import { $componentOptions } from "~/builder/features/command-panel/groups/components-group";
import {
  closeCommandPanel,
  openCommandPanel,
} from "~/builder/features/command-panel/command-state";
import {
  $registeredComponentMetas,
  $registeredComponents,
  $registeredTemplates,
  insertableDeprecatedComponents,
  registerComponentLibrary,
} from "./components";

afterEach(() => {
  closeCommandPanel();
  $registeredComponents.set(new Map());
  $registeredComponentMetas.set(new Map());
  $registeredTemplates.set(new Map());
});

test("lists deprecated Webhook Form in the command panel", () => {
  for (const library of canvasComponentLibraries) {
    registerComponentLibrary(library);
  }
  openCommandPanel();

  expect($componentOptions.get()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "WebhookForm",
        label: "Webhook Form (Deprecated)",
        firstInstance: expect.objectContaining({ component: "WebhookForm" }),
      }),
    ])
  );
});

test("renders templates that import an alternate registered implementation", () => {
  registerComponentLibrary({
    components: {},
    componentIds,
    metas: {},
    templates: {
      code_text: {
        category: "typography",
        template: <CodeText>const status = "ready";</CodeText>,
      },
    },
  });

  const template = $registeredTemplates.get().get("code_text")?.template;
  expect(template?.instances[0]?.component).toBe("CodeText");
});

test("lists the managed Form while retaining saved Webhook Forms", () => {
  for (const library of canvasComponentLibraries) {
    registerComponentLibrary(library);
  }
  const itemsByCategory = listBuilderComponentPanelItems({
    metas: $registeredComponentMetas.get(),
    templates: $registeredTemplates.get(),
    includeDeprecatedComponents: insertableDeprecatedComponents,
    getFallbackLabel: (component) => getInstanceLabel({ component }),
    getMetaLabel: (component) => getInstanceLabel({ component }),
  });
  const forms = itemsByCategory
    .get("forms")
    ?.filter(({ name }) => name === "form");

  expect(forms).toEqual([
    expect.objectContaining({
      name: "form",
      label: "Form (Beta)",
      firstInstance: expect.objectContaining({ component: "ResourceForm" }),
    }),
  ]);

  expect(itemsByCategory.get("data")).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "WebhookForm",
        label: "Webhook Form (Deprecated)",
        firstInstance: expect.objectContaining({ component: "WebhookForm" }),
      }),
    ])
  );

  // Saved instances keep their original component IDs and implementations.
  expect($registeredComponents.get().has("ResourceForm")).toBe(true);
  expect($registeredComponents.get().has("Form")).toBe(false);
  expect($registeredComponents.get().has("WebhookForm")).toBe(true);
  expect($registeredComponents.get().has("RemixForm")).toBe(true);
  expect($registeredComponentMetas.get().get("ResourceForm")?.deprecated).toBe(
    undefined
  );
  expect($registeredComponentMetas.get().get("WebhookForm")?.label).toBe(
    "Webhook Form"
  );
  expect($registeredComponentMetas.get().get("WebhookForm")?.deprecated).toBe(
    true
  );
  expect($registeredComponentMetas.get().get("RemixForm")?.deprecated).toBe(
    true
  );
  expect(
    $registeredTemplates.get().get("WebhookForm")?.template.instances[0]
      ?.component
  ).toBe("WebhookForm");
});
