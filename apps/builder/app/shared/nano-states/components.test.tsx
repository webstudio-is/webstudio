/** Verifies that Builder template registration resolves imported component objects. */
import { afterEach, expect, test } from "vitest";
import { listBuilderComponentPanelItems } from "@webstudio-is/project-build/runtime";
import { CodeText } from "@webstudio-is/sdk-components-react/components";
import { canvasComponentLibraries } from "@webstudio-is/sdk-components-registry/canvas";
import { componentIds } from "@webstudio-is/sdk-components-registry/components";
import { getInstanceLabel } from "~/builder/shared/instance-label";
import {
  $registeredComponentMetas,
  $registeredComponents,
  $registeredTemplates,
  registerComponentLibrary,
} from "./components";

afterEach(() => {
  $registeredComponents.set(new Map());
  $registeredComponentMetas.set(new Map());
  $registeredTemplates.set(new Map());
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

test("lists the managed Form while retaining deprecated Webhook Form", () => {
  for (const library of canvasComponentLibraries) {
    registerComponentLibrary(library);
  }
  const itemsByCategory = listBuilderComponentPanelItems({
    metas: $registeredComponentMetas.get(),
    templates: $registeredTemplates.get(),
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
      firstInstance: expect.objectContaining({ component: "Form" }),
    }),
  ]);

  // The legacy template remains in its original category through the next release.
  expect(
    itemsByCategory.get("data")?.some(({ name }) => name === "WebhookForm")
  ).toBe(true);

  // Saved instances keep their original component IDs and implementations.
  expect($registeredComponents.get().has("Form")).toBe(true);
  expect($registeredComponents.get().has("ResourceForm")).toBe(false);
  expect($registeredComponents.get().has("WebhookForm")).toBe(true);
  expect($registeredComponents.get().has("RemixForm")).toBe(true);
  expect($registeredComponentMetas.get().get("Form")?.deprecated).toBe(
    undefined
  );
  expect($registeredComponentMetas.get().get("WebhookForm")?.label).toBe(
    "Webhook Form"
  );
  expect($registeredComponentMetas.get().get("RemixForm")?.deprecated).toBe(
    true
  );
  expect(
    $registeredTemplates.get().get("WebhookForm")?.template.instances[0]
      ?.component
  ).toBe("WebhookForm");
});
