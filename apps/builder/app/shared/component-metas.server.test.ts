import { describe, expect, test } from "vitest";
import { coreMetas } from "@webstudio-is/sdk";
import { componentMetas } from "./component-metas.server";

describe("component metas", () => {
  test("combines core and namespaced component package metadata", () => {
    for (const component of Object.keys(coreMetas)) {
      expect(componentMetas.has(component)).toBe(true);
    }
    expect(
      componentMetas.has("@webstudio-is/sdk-components-react-radix:Accordion")
    ).toBe(true);
    expect(
      componentMetas.has(
        "@webstudio-is/sdk-components-animation:AnimateChildren"
      )
    ).toBe(true);
    expect(componentMetas.size).toBeGreaterThan(Object.keys(coreMetas).length);
  });
});
