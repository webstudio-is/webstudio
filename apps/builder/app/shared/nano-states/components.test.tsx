/** Verifies that Builder template registration resolves imported component objects. */
import { afterEach, expect, test } from "vitest";
import { listBuilderComponentPanelItems } from "@webstudio-is/project-build/runtime";
import { CodeText } from "@webstudio-is/sdk-components-react/components";
import { canvasComponentLibraries } from "@webstudio-is/sdk-components-registry/canvas";
import { componentIds } from "@webstudio-is/sdk-components-registry/components";
import { getInstanceLabel } from "~/builder/shared/instance-label";
import { getComponentTemplatesForPicker } from "~/shared/component-catalog";
import {
  $registeredComponentHooks,
  $registeredComponentMetas,
  $registeredComponents,
  $registeredTemplates,
  registerComponentLibrary,
} from "./components";

afterEach(() => {
  $registeredComponents.set(new Map());
  $registeredComponentMetas.set(new Map());
  $registeredTemplates.set(new Map());
  $registeredComponentHooks.set([]);
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

test("the new Form is feature gated without changing Webhook Form", () => {
  for (const library of canvasComponentLibraries) {
    registerComponentLibrary(library);
  }

  const templates = $registeredTemplates.get();
  const hiddenPanelItems = listBuilderComponentPanelItems({
    metas: $registeredComponentMetas.get(),
    templates: getComponentTemplatesForPicker(templates, false),
    getFallbackLabel: (component) => getInstanceLabel({ component }),
    getMetaLabel: (component) => getInstanceLabel({ component }),
  });
  const hiddenForms = hiddenPanelItems
    .get("forms")
    ?.filter(({ name }) => name === "form");

  expect(hiddenForms).toEqual([]);
  expect(hiddenPanelItems.get("data")).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "Form",
        label: "Webhook Form",
        firstInstance: expect.objectContaining({ component: "Form" }),
      }),
    ])
  );

  const forms = listBuilderComponentPanelItems({
    metas: $registeredComponentMetas.get(),
    templates: getComponentTemplatesForPicker(templates, true),
    getFallbackLabel: (component) => getInstanceLabel({ component }),
    getMetaLabel: (component) => getInstanceLabel({ component }),
  })
    .get("forms")
    ?.filter(({ name }) => name === "form");

  expect(forms).toEqual([
    expect.objectContaining({
      name: "form",
      label: "Form (new)",
      firstInstance: expect.objectContaining({ component: "NativeForm" }),
    }),
  ]);

  // Saved instances keep their original component IDs and implementations.
  expect($registeredComponents.get().has("Form")).toBe(true);
  expect($registeredComponents.get().has("RemixForm")).toBe(true);
  expect($registeredComponentMetas.get().get("Form")?.deprecated).toBe(
    undefined
  );
  expect($registeredComponentMetas.get().get("Form")?.label).toBe(
    "Webhook Form"
  );
  expect($registeredComponentMetas.get().get("RemixForm")?.deprecated).toBe(
    true
  );
  expect($registeredComponentMetas.get().get("NativeForm")?.deprecated).toBe(
    undefined
  );
  expect(
    $registeredTemplates.get().get("Form")?.template.instances[0]?.component
  ).toBe("Form");
});
