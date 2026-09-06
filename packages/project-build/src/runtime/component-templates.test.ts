import { describe, expect, test } from "vitest";
import { getComponentTemplates } from "./component-templates";

describe("getComponentTemplates", () => {
  test("returns rendered templates synchronously and caches the registry", () => {
    const templates = getComponentTemplates();

    expect(getComponentTemplates()).toBe(templates);
    expect(templates.get("Form")).toEqual(
      expect.objectContaining({
        template: expect.objectContaining({
          children: expect.any(Array),
          instances: expect.any(Array),
        }),
      })
    );
    const switchTemplate = templates.get(
      "@webstudio-is/sdk-components-react-radix:Switch"
    );
    expect(switchTemplate).toEqual(
      expect.objectContaining({
        template: expect.objectContaining({
          children: expect.any(Array),
          instances: expect.any(Array),
        }),
      })
    );
    expect(switchTemplate?.template.instances[0]?.component).toBe(
      "@webstudio-is/sdk-components-react-radix:Switch"
    );
  });
});
