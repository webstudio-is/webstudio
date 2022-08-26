import { createInstance } from "./create-instance";
import { findClosestNonInlineParent } from "./find-closest-non-inline-parent";

describe("findClosestNonInlineParent", () => {
  const italic = createInstance({ component: "Italic" });

  const boldWithItalic = createInstance({
    component: "Bold",
    children: [italic],
  });

  test("when there's no non-inline parent, returns undefined", () => {
    expect(
      findClosestNonInlineParent(boldWithItalic, italic.id)
    ).toBeUndefined();
    expect(findClosestNonInlineParent(italic, italic.id)).toBeUndefined();
  });

  test("when the given instance isn't in the tree, returns undefined", () => {
    const root = createInstance({ component: "Body" });
    expect(findClosestNonInlineParent(root, italic.id)).toBeUndefined();
  });

  test("retrunrns the first non-inline parent", () => {
    const root = createInstance({
      component: "Body",
      children: [
        createInstance({
          component: "Heading",
          id: "the-heading",
          children: [italic],
        }),
      ],
    });
    expect(findClosestNonInlineParent(root, italic.id)?.id).toBe("the-heading");
  });

  test("retrunrns the first non-inline parent (nested)", () => {
    const root = createInstance({
      component: "Body",
      children: [
        createInstance({
          component: "Heading",
          id: "the-heading",
          children: [boldWithItalic],
        }),
      ],
    });
    expect(findClosestNonInlineParent(root, italic.id)?.id).toBe("the-heading");
  });
});
