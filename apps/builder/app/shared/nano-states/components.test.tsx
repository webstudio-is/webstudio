/** Verifies that Builder template registration resolves imported component objects. */
import { afterEach, expect, test } from "vitest";
import { listBuilderComponentPanelItems } from "@webstudio-is/project-build/runtime";
import { CodeText } from "@webstudio-is/sdk-components-react/components";
import { canvasComponentLibraries } from "@webstudio-is/sdk-components-registry/canvas";
import { componentIds } from "@webstudio-is/sdk-components-registry/components";
import { getInstanceLabel } from "~/builder/shared/instance-label";
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

test("the Forms section inserts only the new Form", () => {
  for (const library of canvasComponentLibraries) {
    registerComponentLibrary(library);
  }

  const forms = listBuilderComponentPanelItems({
    metas: $registeredComponentMetas.get(),
    templates: $registeredTemplates.get(),
    getFallbackLabel: (component) => getInstanceLabel({ component }),
    getMetaLabel: (component) => getInstanceLabel({ component }),
  })
    .get("forms")
    ?.filter(({ label }) => label === "Form");

  expect(forms).toEqual([
    expect.objectContaining({
      name: "form",
      firstInstance: expect.objectContaining({ component: "NativeForm" }),
    }),
  ]);
});
