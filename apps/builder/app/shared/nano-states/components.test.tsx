/** Verifies that Builder template registration resolves imported component objects. */
import { afterEach, expect, test } from "vitest";
import { CodeText } from "@webstudio-is/sdk-components-react/components";
import { componentIds } from "@webstudio-is/sdk-components-registry/components";
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
