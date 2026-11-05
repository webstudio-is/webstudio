import { expect, test } from "vitest";
import { createPages } from "./template";

test("new 404 pages stack sections and center the message within main", () => {
  const data = createPages();
  const page = Array.from(data.pages.pages.values()).find(
    (page) => page.path === "/*"
  )!;
  const body = data.instances.get(page.rootInstanceId)!;
  const mainChild = body.children[0];
  expect(mainChild.type).toBe("id");
  if (mainChild.type !== "id") {
    throw new Error("Expected a main area instance");
  }
  const main = data.instances.get(mainChild.value)!;
  const getStyles = (instanceId: string) => {
    const selection = data.styleSourceSelections.get(instanceId)!;
    return Object.fromEntries(
      Array.from(data.styles.values())
        .filter((style) => selection.values.includes(style.styleSourceId))
        .map((style) => [style.property, style.value])
    );
  };

  expect(getStyles(body.id)).toMatchObject({
    display: { type: "keyword", value: "flex" },
    flexDirection: { type: "keyword", value: "column" },
  });
  // Header and footer added beside main should keep their natural full width.
  expect(getStyles(body.id)).not.toHaveProperty("alignItems");
  expect(getStyles(body.id)).not.toHaveProperty("justifyContent");
  expect(main.tag).toBe("main");
  expect(getStyles(main.id)).toMatchObject({
    flexGrow: { type: "unit", unit: "number", value: 1 },
    display: { type: "keyword", value: "flex" },
    flexDirection: { type: "keyword", value: "column" },
    justifyContent: { type: "keyword", value: "center" },
    alignItems: { type: "keyword", value: "center" },
  });
});
