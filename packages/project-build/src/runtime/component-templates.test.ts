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
    expect(
      templates.get("@webstudio-is/sdk-components-react-radix:Switch")
    ).toEqual(
      expect.objectContaining({
        template: expect.objectContaining({
          children: expect.any(Array),
          instances: expect.any(Array),
        }),
      })
    );
  });
});
